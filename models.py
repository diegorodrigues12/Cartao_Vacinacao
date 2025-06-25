from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash # NOVA IMPORTAÇÃO para senhas

db = SQLAlchemy()

class Vacina(db.Model):
    __tablename__ = 'vacinas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    categoria = db.Column(db.String(100), nullable=False, default='Geral') # Campo categoria

    # Relacionamento com Vacinacao
    vacinacoes = db.relationship('Vacinacao', backref='vacina', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Vacina {self.nome} ({self.categoria})>"

class Pessoa(db.Model):
    __tablename__ = 'pessoas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    numero_identificacao = db.Column(db.String(50), unique=True, nullable=False) # Ex: CPF, RG, etc.

    # Relacionamento com Vacinacao
    vacinacoes = db.relationship('Vacinacao', backref='pessoa', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Pessoa {self.nome} ({self.numero_identificacao})>"

class Vacinacao(db.Model):
    __tablename__ = 'vacinacoes'
    id = db.Column(db.Integer, primary_key=True)
    pessoa_id = db.Column(db.Integer, db.ForeignKey('pessoas.id'), nullable=False)
    vacina_id = db.Column(db.Integer, db.ForeignKey('vacinas.id'), nullable=False)
    data_aplicacao = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    dose_aplicada = db.Column(db.String(50), nullable=False) # Ex: "1a Dose", "2a Dose", "Reforco", etc.

    __table_args__ = (db.UniqueConstraint('pessoa_id', 'vacina_id', 'dose_aplicada', name='_pessoa_vacina_dose_uc'),)

    def __repr__(self):
        return f"<Vacinacao Pessoa_ID:{self.pessoa_id} Vacina_ID:{self.vacina_id} Dose:{self.dose_aplicada}>"

# NOVO: Modelo de Usuário para Autenticação
class User(db.Model):
    __tablename__ = 'users' # Nome da tabela no banco de dados
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False) # Armazena o hash da senha

    # Método para definir a senha (faz o hash)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # Método para verificar a senha
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username}>"
