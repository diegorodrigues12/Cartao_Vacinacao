# cartao_vacinacao_api/schemas.py
from flask_marshmallow import Marshmallow
from models import Vacina, Pessoa, Vacinacao
from datetime import datetime # Importar caso precise para validações ou customizações

ma = Marshmallow()

class VacinaSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Vacina
        load_instance = True
        sqla_session = None # Será definido no app.py

class PessoaSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Pessoa
        load_instance = True
        sqla_session = None

class VacinacaoSchema(ma.SQLAlchemyAutoSchema):
    data_aplicacao = ma.fields.DateTime(format='%Y-%m-%dT%H:%M:%S') # Formato ISO 8601

    class Meta:
        model = Vacinacao
        load_instance = True
        sqla_session = None