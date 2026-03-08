"""Engine for bulk uploading ad variations to Facebook as draft ads."""

import logging
import os

from sqlalchemy.orm import Session

from app.models import AdVariation, PlatformConnection
from app.services.meta_client import MetaClient

logger = logging.getLogger(__name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "ad_images")


async def bulk_upload_to_facebook(
    db: Session,
    product_id: str,
    variation_ids: list[str],
    ad_set_id: str,
    connection_id: str,
    destination_url: str,
    page_id: str,
) -> dict:
    """Upload ad variations to Facebook as paused ads in the specified ad set."""

    connection = db.query(PlatformConnection).filter(PlatformConnection.id == connection_id).first()
    if not connection:
        raise ValueError("Platform connection not found")

    client = MetaClient(
        access_token=connection.access_token,
        ad_account_id=connection.platform_account_id or "",
    )

    uploaded = 0
    failed = 0

    for var_id in variation_ids:
        variation = db.query(AdVariation).filter(AdVariation.id == var_id).first()
        if not variation:
            failed += 1
            continue

        try:
            # Upload image if available
            image_hash = None
            if variation.image_url:
                image_path = os.path.join(
                    os.path.dirname(UPLOAD_DIR),
                    os.path.basename(os.path.dirname(variation.image_url)),
                    os.path.basename(variation.image_url),
                )
                if os.path.exists(image_path):
                    with open(image_path, "rb") as f:
                        image_bytes = f.read()
                    result = await client.upload_image(image_bytes, f"ad_{variation.id}")
                    image_hash = result.get("hash")

            # Create the ad creative
            creative_result = await client.create_ad_creative(
                name=f"Ad Creative - {variation.headline[:30]}",
                page_id=page_id,
                headline=variation.headline,
                body=variation.body,
                link_url=destination_url,
                image_hash=image_hash,
            )
            creative_id = creative_result.get("id")

            if not creative_id:
                logger.error("No creative ID returned for variation %s", var_id)
                failed += 1
                continue

            # Create the ad (paused)
            ad_result = await client.create_ad(
                ad_set_id=ad_set_id,
                creative_id=creative_id,
                name=f"Ad - {variation.headline[:40]}",
                status="PAUSED",
            )

            variation.meta_ad_id = ad_result.get("id")
            variation.status = "uploaded"
            db.commit()
            uploaded += 1
            logger.info("Uploaded variation %s as ad %s", var_id, variation.meta_ad_id)

        except Exception as e:
            logger.error("Failed to upload variation %s: %s", var_id, e)
            failed += 1

    return {"uploaded": uploaded, "failed": failed}
