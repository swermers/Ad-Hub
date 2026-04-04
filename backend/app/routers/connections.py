from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PlatformConnection
from app.permissions import deny_agent, get_current_user, scope_product_query

router = APIRouter(dependencies=[Depends(deny_agent)])


class ConnectionCreate(BaseModel):
    product_id: str
    platform: str
    access_token: str
    refresh_token: str | None = None
    platform_account_id: str | None = None
    platform_account_name: str | None = None
    token_expires_at: datetime | None = None


class ConnectionResponse(BaseModel):
    id: str
    product_id: str
    platform: str
    platform_account_id: str | None
    platform_account_name: str | None
    status: str
    token_expires_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectionTestResult(BaseModel):
    valid: bool
    account_info: dict | None = None
    error: str | None = None


@router.get("", response_model=list[ConnectionResponse])
def list_connections(
    product_id: str | None = None,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    query = db.query(PlatformConnection)
    query = scope_product_query(query, PlatformConnection, user, db)
    if product_id:
        query = query.filter(PlatformConnection.product_id == product_id)
    return query.order_by(PlatformConnection.created_at.desc()).all()


@router.post("", response_model=ConnectionResponse, status_code=201)
def create_connection(data: ConnectionCreate, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    conn = PlatformConnection(**data.model_dump())
    db.add(conn)
    db.commit()
    db.refresh(conn)
    return conn


@router.get("/{connection_id}", response_model=ConnectionResponse)
def get_connection(connection_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    conn = scope_product_query(db.query(PlatformConnection), PlatformConnection, user, db).filter(PlatformConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    return conn


@router.delete("/{connection_id}", status_code=204)
def delete_connection(connection_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    conn = scope_product_query(db.query(PlatformConnection), PlatformConnection, user, db).filter(PlatformConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(conn)
    db.commit()


@router.post("/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(connection_id: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    conn = scope_product_query(db.query(PlatformConnection), PlatformConnection, user, db).filter(PlatformConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    try:
        if conn.platform == "twitter":
            from app.services.twitter_client import TwitterClient

            client = TwitterClient(conn.access_token, conn.refresh_token or "")
            info = client.verify_credentials()
            return ConnectionTestResult(valid=True, account_info=info)

        elif conn.platform == "meta":
            from app.services.meta_client import MetaClient

            client = MetaClient(conn.access_token, conn.platform_account_id or "")
            info = await client.verify_token()
            return ConnectionTestResult(valid=True, account_info=info)

        else:
            return ConnectionTestResult(valid=False, error=f"Unsupported platform: {conn.platform}")

    except Exception as e:
        return ConnectionTestResult(valid=False, error=str(e))
