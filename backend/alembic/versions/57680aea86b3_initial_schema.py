"""Initial schema

Revision ID: 57680aea86b3
Revises: 
Create Date: 2026-05-14 20:36:10.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '57680aea86b3'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. ROL
    op.create_table(
        'rol',
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('descripcion', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('codigo')
    )
    
    # 2. USUARIO
    op.create_table(
        'usuario',
        sa.Column('nombre', sa.String(length=80), nullable=False),
        sa.Column('apellido', sa.String(length=80), nullable=False),
        sa.Column('email', sa.String(length=254), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('password_hash', sa.String(length=60), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usuario_email'), 'usuario', ['email'], unique=True)

    # 3. USUARIOROL
    op.create_table(
        'usuariorol',
        sa.Column('usuario_id', sa.Integer(), nullable=False),
        sa.Column('rol_codigo', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['rol_codigo'], ['rol.codigo'], ),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuario.id'], ),
        sa.PrimaryKeyConstraint('usuario_id', 'rol_codigo')
    )

    # 4. ESTADOPEDIDO
    op.create_table(
        'estadopedido',
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('descripcion', sa.String(), nullable=True),
        sa.Column('orden', sa.Integer(), nullable=False),
        sa.Column('es_terminal', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('codigo')
    )

    # 5. FORMAPAGO
    op.create_table(
        'formapago',
        sa.Column('codigo', sa.String(length=20), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('habilitado', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('codigo')
    )


def downgrade() -> None:
    op.drop_table('formapago')
    op.drop_table('estadopedido')
    op.drop_table('usuariorol')
    op.drop_index(op.f('ix_usuario_email'), table_name='usuario')
    op.drop_table('usuario')
    op.drop_table('rol')
