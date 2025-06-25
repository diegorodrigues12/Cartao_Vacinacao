# cartao_vacinacao_api/models.py
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Vacina(db.Model):
    __tablename__ = 'vacinas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)

    # Relacionamento com Vacinacao
    vacinacoes = db.relationship('Vacinacao', backref='vacina', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Vacina {self.nome}>"

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

    # Garante que não haja múltiplas vacinações da mesma vacina com a mesma dose para a mesma pessoa
    __table_args__ = (db.UniqueConstraint('pessoa_id', 'vacina_id', 'dose_aplicada', name='_pessoa_vacina_dose_uc'),)

    def __repr__(self):
        return f"<Vacinacao Pessoa_ID:{self.pessoa_id} Vacina_ID:{self.vacina_id} Dose:{self.dose_aplicada}>"