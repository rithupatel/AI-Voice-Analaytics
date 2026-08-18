import logging
import os

import boto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger(__name__)

def get_s3_client():
    if not settings.S3_BUCKET_NAME or not settings.AWS_ACCESS_KEY_ID:
        return None
        
    return boto3.client(
        's3',
        endpoint_url=settings.S3_ENDPOINT_URL if settings.S3_ENDPOINT_URL else None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        verify=False
    )

def upload_file_to_s3(local_file_path: str, object_name: str | None = None) -> bool:
    """Upload a file to an S3 bucket"""
    if object_name is None:
        object_name = os.path.basename(local_file_path)

    s3_client = get_s3_client()
    if not s3_client:
        logger.warning("S3 credentials not fully configured. Skipping S3 upload.")
        return False

    try:
        s3_client.upload_file(local_file_path, settings.S3_BUCKET_NAME, object_name)
        logger.info(f"Successfully uploaded {local_file_path} to s3://{settings.S3_BUCKET_NAME}/{object_name}")
        return True
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to upload to S3: {e}")
        return False

def download_file_from_s3(object_name: str, local_file_path: str) -> bool:
    """Download a file from an S3 bucket"""
    s3_client = get_s3_client()
    if not s3_client:
        logger.warning("S3 credentials not fully configured. Skipping S3 download.")
        return False

    try:
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
        s3_client.download_file(settings.S3_BUCKET_NAME, object_name, local_file_path)
        logger.info(f"Successfully downloaded s3://{settings.S3_BUCKET_NAME}/{object_name} to {local_file_path}")
        return True
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to download from S3: {e}")
        return False

def get_presigned_url(object_name: str, expiration: int = 3600) -> str:
    """Generate a presigned URL to share an S3 object"""
    s3_client = get_s3_client()
    if not s3_client:
        return None
    try:
        response = s3_client.generate_presigned_url('get_object',
                                                    Params={'Bucket': settings.S3_BUCKET_NAME,
                                                            'Key': object_name},
                                                    ExpiresIn=expiration)
    except ClientError as e:
        logger.error(e)
        return None
    return response
