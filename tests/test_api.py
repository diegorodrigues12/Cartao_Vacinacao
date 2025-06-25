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

            # Opcional: Popular vacinas para testes, se o app.py não fizer isso na inicialização do contexto de teste
            # No seu app.py, a população inicial está dentro do app.app_context().
            # Então, ao chamar db.create_all() aqui, se app.py for importado, as vacinas serão populadas.
            # Se não, você precisaria de uma cópia da lógica de população aqui para ter dados.
            # Para este teste, vamos assumir que o db.create_all() de alguma forma já aciona a população
            # ou que vamos adicionar dados de teste explicitamente nos próprios testes.

        yield client # Retorna o cliente de teste para os testes

        with app.app_context():
            db.drop_all() # Limpa o DB após os testes

# Exemplo de um teste unitário: Testar a rota principal
def test_main_route(client):
    """Testa se a rota principal ('/') retorna o index.html."""
    response = client.get('/')
    assert response.status_code == 200
    assert b"<!DOCTYPE html>" in response.data # Verifica se é uma página HTML
    assert b"Gerenciamento de Cart\xc3\xa3o de Vacina\xc3\xa7\xc3\xa3o" in response.data # Verifica um texto específico (utf-8)
    # Note: \xc3\xa7 é 'ç' em UTF-8. Se o seu terminal/ambiente tiver problemas, use um texto ASCII puro.

# Exemplo de teste para adicionar uma pessoa
def test_add_pessoa(client):
    """Testa o cadastro de uma nova pessoa."""
    data = {
        "nome": "João Silva",
        "numero_identificacao": "11122233344"
    }
    response = client.post('/pessoas', json=data)
    assert response.status_code == 201 # Espera status Created
    assert b"id" in response.data
    assert b"João Silva" in response.data

    # Verifica se a pessoa foi realmente adicionada no banco
    with app.app_context():
        pessoa = Pessoa.query.filter_by(numero_identificacao="11122233344").first()
        assert pessoa is not None
        assert pessoa.nome == "João Silva"