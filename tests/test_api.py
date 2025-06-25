# cartao_vacinacao_api/tests/test_api.py
import pytest
from app import app, db # Importe seu aplicativo Flask e o objeto db
from models import Pessoa, Vacina, Vacinacao # Importe os modelos necessários

# Configuração do cliente de teste para o Flask
@pytest.fixture(scope='module')
def client():
    app.config['TESTING'] = True
    # Usar um banco de dados em memória para testes, para não bagunçar o DB principal
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        # PUSH do contexto de aplicação AQUI, antes de qualquer operação que possa precisar dele
        # Isso garante que um contexto esteja ativo para toda a duração do teste que usa 'client'
        app_ctx = app.app_context()
        app_ctx.push() 

        db.create_all() # Cria as tabelas no DB em memória
        
        # O app.py já popula as vacinas ao chamar db.create_all() dentro de um app_context().
        # Portanto, isso já deve ter acontecido quando db.create_all() é executado acima.
        
        yield client # Retorna o cliente de teste para os testes
        
        # POP do contexto de aplicação AQUI, após os testes
        # Garante que a sessão seja removida antes do pop do contexto
        db.session.remove() 
        db.drop_all() # Limpa o DB após os testes
        app_ctx.pop() 

# Exemplo de um teste unitário: Testar a rota principal
def test_main_route(client):
    """Testa se a rota principal ('/') retorna o index.html."""
    response = client.get('/')
    assert response.status_code == 200
    assert b"<!DOCTYPE html>" in response.data # Verifica se é uma página HTML
    assert "Gerenciamento de Cartão de Vacinação" in response.data.decode('utf-8') 

# Teste para adicionar uma pessoa
def test_add_pessoa(client):
    """Testa o cadastro de uma nova pessoa."""
    data = {
        "nome": "João Silva",
        "numero_identificacao": "11122233344"
    }
    response = client.post('/pessoas', json=data)
    assert response.status_code == 201 # Espera status Created
    
    response_json = response.get_json() 
    assert "id" in response_json
    assert response_json["nome"] == "João Silva"
    assert response_json["numero_identificacao"] == "11122233344"
    
    # As operações de DB dentro dos testes agora dependem do contexto ativado pelo fixture
    pessoa = db.session.get(Pessoa, response_json["id"])
    assert pessoa is not None
    assert pessoa.nome == "João Silva"

# Teste para listar pessoas
def test_get_pessoas(client):
    """Testa a listagem de pessoas."""
    # Adiciona uma pessoa primeiro para garantir que há dados
    client.post('/pessoas', json={"nome": "Maria Souza", "numero_identificacao": "55566677788"})
    
    response = client.get('/pessoas')
    assert response.status_code == 200
    response_json = response.get_json()
    assert isinstance(response_json, list)
    assert len(response_json) >= 1 # Deve ter pelo menos a Maria Souza

# Teste para obter uma pessoa por ID
def test_get_pessoa_by_id(client):
    """Testa a obtenção de uma pessoa por ID."""
    # Adiciona uma pessoa e obtém o ID
    add_response = client.post('/pessoas', json={"nome": "Pedro Santos", "numero_identificacao": "99988877766"})
    pessoa_id = add_response.get_json()["id"]

    response = client.get(f'/pessoas/{pessoa_id}')
    assert response.status_code == 200
    response_json = response.get_json()
    assert response_json["nome"] == "Pedro Santos"

# Teste para excluir uma pessoa
def test_delete_pessoa(client):
    """Testa a exclusão de uma pessoa e suas vacinações."""
    # Adiciona uma pessoa para excluir
    add_response = client.post('/pessoas', json={"nome": "Ana Lima", "numero_identificacao": "12312312312"})
    pessoa_id = add_response.get_json()["id"]

    # Adiciona uma vacinação para essa pessoa (para testar o cascade delete)
    # E vamos garantir que a vacina exista no DB de teste
    vacina_bcg = db.session.query(Vacina).filter_by(nome="BCG").first()
    if not vacina_bcg:
        vacina_bcg = Vacina(nome="BCG", categoria="Nacional")
        db.session.add(vacina_bcg)
        db.session.commit()
        # Após adicionar, o objeto `vacina_bcg` estará "persistente" para uso no teste atual

    add_vacinacao_data = {
        "pessoa_id": pessoa_id,
        "vacina_id": vacina_bcg.id,
        "dose_aplicada": "1a Dose",
        "data_aplicacao": "2023-01-01T10:00:00"
    }
    client.post('/vacinacoes', json=add_vacinacao_data)

    delete_response = client.delete(f'/pessoas/{pessoa_id}')
    assert delete_response.status_code == 200
    assert b"removidos com sucesso" in delete_response.data

    # Verifica se a pessoa foi realmente removida
    get_response = client.get(f'/pessoas/{pessoa_id}')
    assert get_response.status_code == 404

    # Verifica se as vacinações da pessoa também foram removidas
    vacinacoes_restantes = Vacinacao.query.filter_by(pessoa_id=pessoa_id).all()
    assert len(vacinacoes_restantes) == 0

# Teste para adicionar uma vacinação
def test_add_vacinacao(client):
    """Testa o cadastro de uma nova vacinação."""
    # Prepara dados: pessoa e vacina
    add_pessoa_response = client.post('/pessoas', json={"nome": "Carlos Teste", "numero_identificacao": "10120230340"})
    pessoa_id = add_pessoa_response.get_json()["id"]
    
    vacina_hepatite_b = db.session.query(Vacina).filter_by(nome="HEPATITE B").first()
    if not vacina_hepatite_b:
        vacina_hepatite_b = Vacina(nome="HEPATITE B", categoria="Nacional")
        db.session.add(vacina_hepatite_b)
        db.session.commit()

    data = {
        "pessoa_id": pessoa_id,
        "vacina_id": vacina_hepatite_b.id,
        "dose_aplicada": "1a Dose",
        "data_aplicacao": "2024-05-10T14:30:00"
    }
    response = client.post('/vacinacoes', json=data)
    assert response.status_code == 201
    response_json = response.get_json()
    assert "id" in response_json 
    assert response_json["dose_aplicada"] == "1a Dose"

# Teste de validação: 2a Dose sem 1a Dose (ATENÇÃO: Validação está no frontend)
def test_add_vacinacao_2a_dose_sem_1a(client):
    """
    Testa o cenário de adicionar uma 2a Dose sem a 1a.
    NOTE: A validação sequencial de doses está no frontend (script.js).
    Se esta lógica for movida para o backend, o status esperado pode mudar para 400.
    """
    add_pessoa_response = client.post('/pessoas', json={"nome": "Daniela Valida", "numero_identificacao": "12345678910"})
    pessoa_id = add_pessoa_response.get_json()["id"]
    
    vacina_tetra = db.session.query(Vacina).filter_by(nome="TETRA VALENTE").first()
    if not vacina_tetra:
        vacina_tetra = Vacina(nome="TETRA VALENTE", categoria="Nacional")
        db.session.add(vacina_tetra)
        db.session.commit()

    data = {
        "pessoa_id": pessoa_id,
        "vacina_id": vacina_tetra.id,
        "dose_aplicada": "2a Dose",
        "data_aplicacao": "2024-06-01T09:00:00"
    }
    response = client.post('/vacinacoes', json=data)
    # Como a validação é no frontend, o backend ainda aceitará essa requisição
    assert response.status_code == 201 
    # Se a validação fosse no backend, teríamos:
    # assert response.status_code == 400
    # assert b"Para aplicar a 2ª Dose" in response.data # ou mensagem de erro específica

# Teste para consultar o cartão de vacinação de uma pessoa
def test_get_cartao_vacinacao(client):
    """Testa a consulta do cartão de vacinação de uma pessoa."""
    add_pessoa_response = client.post('/pessoas', json={"nome": "Fernanda Teste", "numero_identificacao": "66677788899"})
    pessoa_id = add_pessoa_response.get_json()["id"]

    vacina_bcg = db.session.query(Vacina).filter_by(nome="BCG").first()
    vacina_hepatite_b = db.session.query(Vacina).filter_by(nome="HEPATITE B").first()
    # Adicionar vacinas se não existirem (garantir para testes futuros)
    if not vacina_bcg: 
        vacina_bcg = Vacina(nome="BCG", categoria="Nacional")
        db.session.add(vacina_bcg)
        db.session.commit()
    if not vacina_hepatite_b: 
        vacina_hepatite_b = Vacina(nome="HEPATITE B", categoria="Nacional")
        db.session.add(vacina_hepatite_b)
        db.session.commit()


    client.post('/vacinacoes', json={
        "pessoa_id": pessoa_id,
        "vacina_id": vacina_bcg.id,
        "dose_aplicada": "1a Dose",
        "data_aplicacao": "2023-03-01T10:00:00"
    })
    client.post('/vacinacoes', json={
        "pessoa_id": pessoa_id,
        "vacina_id": vacina_hepatite_b.id,
        "dose_aplicada": "Faltoso",
        "data_aplicacao": "2023-03-02T11:00:00"
    })

    response = client.get(f'/pessoas/{pessoa_id}/cartao_vacinacao')
    assert response.status_code == 200
    response_json = response.get_json()

    assert response_json["pessoa"]["nome"] == "Fernanda Teste"
    assert len(response_json["vacinas_registradas"]) >= 2 # Deve ter pelo menos BCG e Hepatite B

    # Verifica se a vacina BCG e a dose foram registradas
    bcg_entry = next((v for v in response_json["vacinas_registradas"] if v["nome_vacina"] == "BCG"), None)
    assert bcg_entry is not None
    assert len(bcg_entry["doses"]) == 1
    assert bcg_entry["doses"][0]["dose_aplicada"] == "1a Dose"

    # Verifica se a vacina Hepatite B e a dose foram registradas
    hepatite_b_entry = next((v for v in response_json["vacinas_registradas"] if v["nome_vacina"] == "HEPATITE B"), None)
    assert hepatite_b_entry is not None
    assert len(hepatite_b_entry["doses"]) == 1
    assert hepatite_b_entry["doses"][0]["dose_aplicada"] == "Faltoso"

# Teste para excluir uma vacinação
def test_delete_vacinacao(client):
    """Testa a exclusão de um registro de vacinação específico."""
    add_pessoa_response = client.post('/pessoas', json={"nome": "Gustavo Excluir", "numero_identificacao": "11223344556"})
    pessoa_id = add_pessoa_response.get_json()["id"]

    vacina_rotavirus = db.session.query(Vacina).filter_by(nome="ROTAVIRUS").first()
    if not vacina_rotavirus:
        vacina_rotavirus = Vacina(nome="ROTAVIRUS", categoria="Nacional")
        db.session.add(vacina_rotavirus)
        db.session.commit()

    add_vacinacao_data = {
        "pessoa_id": pessoa_id,
        "vacina_id": vacina_rotavirus.id,
        "dose_aplicada": "1a Dose",
        "data_aplicacao": "2024-01-01T08:00:00"
    }
    add_vacinacao_response = client.post('/vacinacoes', json=add_vacinacao_data)
    vacinacao_id = add_vacinacao_response.get_json()["id"] 

    delete_response = client.delete(f'/vacinacoes/{vacinacao_id}')
    assert delete_response.status_code == 200
    assert b"removido com sucesso" in delete_response.data

    # Verifica se a vacinação foi realmente removida
    vacinacao_restante = db.session.get(Vacinacao, vacinacao_id)
    assert vacinacao_restante is None

# Teste para listar vacinas filtradas por categoria
def test_get_vacinas_by_category(client):
    """Testa a listagem de vacinas filtradas por categoria."""
    # A população inicial já deve ter vacinas com categorias como 'Nacional' e 'Anti Rábica'.
    
    response_nacional = client.get('/vacinas?categoria=Nacional')
    assert response_nacional.status_code == 200
    vacinas_nacionais = response_nacional.get_json()
    assert isinstance(vacinas_nacionais, list)
    assert any(vacina['nome'] == 'BCG' for vacina in vacinas_nacionais)
    assert all(vacina['categoria'] == 'Nacional' for vacina in vacinas_nacionais)

    response_anti_rabica = client.get('/vacinas?categoria=Anti Rábica')
    assert response_anti_rabica.status_code == 200
    vacinas_anti_rabica = response_anti_rabica.get_json()
    assert isinstance(vacinas_anti_rabica, list)
    assert any(vacina['nome'] == 'Anti Rábica Humana' for vacina in vacinas_anti_rabica)
    assert all(vacina['categoria'] == 'Anti Rábica' for vacina in vacinas_anti_rabica)

    response_inexistente = client.get('/vacinas?categoria=Inexistente')
    assert response_inexistente.status_code == 200
    vacinas_inexistente = response_inexistente.get_json()
    assert isinstance(vacinas_inexistente, list)
    assert len(vacinas_inexistente) == 0 # Nenhuma vacina para categoria inexistente
