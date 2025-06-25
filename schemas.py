from flask_marshmallow import Marshmallow
from models import Vacina, Pessoa, Vacinacao
from datetime import datetime
from marshmallow import fields # Adicione esta linha para importar 'fields'

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
    # A linha abaixo precisa ser alterada
    # data_aplicacao = ma.fields.DateTime(format='%Y-%m-%dT%H:%M:%S')

    # Para esta:
    data_aplicacao = fields.DateTime(format='%Y-%m-%dT%H:%M:%S')

    class Meta:
        model = Vacinacao
        load_instance = True
        sqla_session = None