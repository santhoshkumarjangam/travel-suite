"""
Google Cloud Storage service for Galleriq media storage.

This module handles all interactions with GCS including:
- File uploads with proper folder structure
- Public URL generation
- File deletion and cleanup
"""

import os
import uuid
from typing import Optional, BinaryIO
from google.cloud import storage
from google.oauth2 import service_account
from pathlib import Path

# Environment variables (set these in .env)
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "galleriq-media")
GCS_PROJECT_ID = os.getenv("GCS_PROJECT_ID", "your-project-id")
SERVICE_ACCOUNT_KEY_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account-key.json")


class GCSService:
    """Service for managing Google Cloud Storage operations."""
    
    def __init__(self):
        """Initialize GCS client with service account credentials."""
        # TODO: Replace with your actual service account key path
        if os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
            credentials = service_account.Credentials.from_service_account_file(
                SERVICE_ACCOUNT_KEY_PATH
            )
            self.client = storage.Client(
                credentials=credentials,
                project=GCS_PROJECT_ID
            )
        else:
            # Fallback to default credentials (for local development)
            print(f"Warning: Service account key not found at {SERVICE_ACCOUNT_KEY_PATH}")
            print("Using default credentials. Set GOOGLE_APPLICATION_CREDENTIALS in .env")
            self.client = storage.Client(project=GCS_PROJECT_ID)
        
        self.bucket = self.client.bucket(GCS_BUCKET_NAME)
    
    def _generate_blob_path(
        self,
        user_id: str,
        trip_id: str,
        filename: str,
        variant: str = "original"
    ) -> str:
        """
        Generate GCS blob path following our folder structure.
        
        Args:
            user_id: User's UUID
            trip_id: Trip's UUID
            filename: Original filename
            variant: File variant (original, thumb, etc.)
        
        Returns:
            Path like: users/user_{id}/trips/trip_{id}/photo_{uuid}_{variant}.jpg
        """
        # Extract extension
        ext = Path(filename).suffix.lower()
        
        # Generate unique ID for this file
        file_uuid = str(uuid.uuid4())
        
        # Determine media type
        media_type = "video" if ext in ['.mp4', '.mov', '.avi'] else "photo"
        
        # Build path
        path = f"users/user_{user_id}/trips/trip_{trip_id}/{media_type}_{file_uuid}_{variant}{ext}"
        
        return path
    
    def upload_file(
        self,
        file_obj: BinaryIO,
        user_id: str,
        trip_id: str,
        filename: str,
        content_type: str,
        variant: str = "original"
    ) -> tuple[str, str]:
        """
        Upload a file to GCS.
        
        Args:
            file_obj: File-like object to upload
            user_id: User's UUID
            trip_id: Trip's UUID
            filename: Original filename
            content_type: MIME type (e.g., 'image/jpeg')
            variant: File variant (original, thumb)
        
        Returns:
            Tuple of (gcs_path, public_url)
        """
        # Generate blob path
        blob_path = self._generate_blob_path(user_id, trip_id, filename, variant)
        
        # Create blob
        blob = self.bucket.blob(blob_path)
        
        # Set content type
        blob.content_type = content_type
        
        # Upload file
        blob.upload_from_file(file_obj, content_type=content_type)
        
        # Make public (since we're using public bucket strategy)
        blob.make_public()
        
        # Generate public URL
        public_url = blob.public_url
        
        return blob_path, public_url
    
    def delete_file(self, blob_path: str) -> bool:
        """
        Delete a single file from GCS.
        
        Args:
            blob_path: Relative path in bucket (e.g., users/user_123/trips/trip_456/photo.jpg)
        
        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            blob = self.bucket.blob(blob_path)
            blob.delete()
            return True
        except Exception as e:
            print(f"Error deleting {blob_path}: {e}")
            return False
    
    def delete_user_folder(self, user_id: str) -> int:
        """
        Delete all files for a user (when account is deleted).
        
        Args:
            user_id: User's UUID
        
        Returns:
            Number of files deleted
        """
        prefix = f"users/user_{user_id}/"
        blobs = self.bucket.list_blobs(prefix=prefix)
        
        deleted_count = 0
        for blob in blobs:
            try:
                blob.delete()
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting {blob.name}: {e}")
        
        return deleted_count
    
    def delete_trip_folder(self, user_id: str, trip_id: str) -> int:
        """
        Delete all files for a specific trip.
        
        Args:
            user_id: User's UUID
            trip_id: Trip's UUID
        
        Returns:
            Number of files deleted
        """
        prefix = f"users/user_{user_id}/trips/trip_{trip_id}/"
        blobs = self.bucket.list_blobs(prefix=prefix)
        
        deleted_count = 0
        for blob in blobs:
            try:
                blob.delete()
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting {blob.name}: {e}")
        
        return deleted_count
    
    def get_public_url(self, blob_path: str) -> str:
        """
        Get public URL for a blob.
        
        Args:
            blob_path: Relative path in bucket
        
        Returns:
            Public HTTPS URL
        """
        return f"https://storage.googleapis.com/{GCS_BUCKET_NAME}/{blob_path}"


# Singleton instance
_gcs_service: Optional[GCSService] = None


def get_gcs_service() -> GCSService:
    """Get or create GCS service singleton."""
    global _gcs_service
    if _gcs_service is None:
        _gcs_service = GCSService()
    return _gcs_service
