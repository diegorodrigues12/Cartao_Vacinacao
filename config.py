# cartao_vacinacao_api/config.py
import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///cartao_vacinacao.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'uma_chave_secreta_para_desenvolvimento_nao_usar_em_producao') # Mudar em produção!