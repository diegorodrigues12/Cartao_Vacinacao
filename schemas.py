from flask_marshmallow import Marshmallow
from models import Vacina, Pessoa, Vacinacao, User
from datetime import datetime
from marshmallow import fields

ma = Marshmallow()

class VacinaSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Vacina
        load_instance = True
        sqla_session = None

class PessoaSchema(ma.SQLAlchemyAutoSchema):
    id = fields.Int(dump_only=True)
    nome = fields.Str(required=True)
    numero_identificacao = fields.Str(required=True)

    class Meta:
        model = Pessoa
        load_instance = False # CORRIGIDO AQUI para False
        sqla_session = None

class VacinacaoSchema(ma.SQLAlchemyAutoSchema):
    data_aplicacao = fields.DateTime(format='%Y-%m-%dT%H:%M:%S')

    class Meta:
        model = Vacinacao
        load_instance = True
        sqla_session = None

class UserSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = False # CORRIGIDO AQUI para False (para evitar "Deserialization requires a session" em testes/fluxos futuros)
        sqla_session = None
        load_only = ("password",) 
        dump_only = ("id", "username",) 
