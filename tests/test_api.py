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
        with app.app_context():
            db.create_all() # Cria as tabelas no DB em memória
            
            # A lógica de população inicial do app.py é executada quando o app_context() é ativado
            # e db.create_all() é chamado. Isso deve popular as vacinas automaticamente.
            
        yield client # Retorna o cliente de teste para os testes
        
        with app.app_context():
            db.drop_all() # Limpa o DB após os testes

# Exemplo de um teste unitário: Testar a rota principal
def test_main_route(client):
    """Testa se a rota principal ('/') retorna o index.html."""
    response = client.get('/')
    assert response.status_code == 200
    assert b"<!DOCTYPE html>" in response.data # Verifica se é uma página HTML
    # Testando com texto que deve estar no HTML, decodificando a resposta para string
    assert "Gerenciamento de Cartão de Vacinação" in response.data.decode('utf-8') 

# Exemplo de teste para adicionar uma pessoa
def test_add_pessoa(client):
    """Testa o cadastro de uma nova pessoa."""
    data = {
        "nome": "João Silva",
        "numero_identificacao": "11122233344"
    }
    response = client.post('/pessoas', json=data)
    assert response.status_code == 201 # Espera status Created
    
    # IMPORTANTE: Parseia a resposta JSON para um dicionário Python
    response_json = response.get_json() 

    # Asserções robustas para conteúdo JSON
    assert "id" in response_json
    assert response_json["nome"] == "João Silva"
    assert response_json["numero_identificacao"] == "11122233344"
    
    # Verifica se a pessoa foi realmente adicionada no banco (boa prática)
    with app.app_context():
        pessoa = Pessoa.query.filter_by(numero_identificacao="11122233344").first()
        assert pessoa is not None
        assert pessoa.nome == "João Silva"
