#!/usr/bin/env python3
"""
cleanup_expired_files.py
Removes expired upload/output files older than FILE_EXPIRY_SECONDS.

Usage:
  python scripts/cleanup_expired_files.py            # Dry run
  python scripts/cleanup_expired_files.py --execute   # Actually delete
"""

import os
import sys
import time
import shutil
import argparse

# Default to 2 hours
DEFAULT_EXPIRY_SECONDS = 7200
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend', 'uploads')


def cleanup(upload_dir: str, expiry_seconds: int, dry_run: bool = True) -> dict:
    """Remove directories older than expiry_seconds."""
    now = time.time()
    stats = {'scanned': 0, 'deleted': 0, 'freed_bytes': 0, 'errors': 0}

    if not os.path.isdir(upload_dir):
        print(f"Upload directory does not exist: {upload_dir}")
        return stats

    for entry in os.listdir(upload_dir):
        full_path = os.path.join(upload_dir, entry)
        if not os.path.isdir(full_path):
            continue

        stats['scanned'] += 1
        mod_time = os.path.getmtime(full_path)
        age = now - mod_time

        if age > expiry_seconds:
            # Calculate size
            dir_size = sum(
                os.path.getsize(os.path.join(dp, f))
                for dp, _, filenames in os.walk(full_path)
                for f in filenames
            )

            if dry_run:
                print(f"[DRY RUN] Would delete: {entry} (age: {age:.0f}s, size: {dir_size / 1024:.1f} KB)")
            else:
                try:
                    shutil.rmtree(full_path)
                    print(f"Deleted: {entry} (age: {age:.0f}s, size: {dir_size / 1024:.1f} KB)")
                    stats['deleted'] += 1
                    stats['freed_bytes'] += dir_size
                except Exception as e:
                    print(f"Error deleting {entry}: {e}")
                    stats['errors'] += 1

    return stats


def main():
    parser = argparse.ArgumentParser(description='Cleanup expired upload files')
    parser.add_argument('--execute', action='store_true', help='Actually delete files (default is dry run)')
    parser.add_argument('--expiry', type=int, default=DEFAULT_EXPIRY_SECONDS, help='Expiry time in seconds')
    parser.add_argument('--dir', type=str, default=UPLOAD_DIR, help='Upload directory path')
    args = parser.parse_args()

    dry_run = not args.execute
    if dry_run:
        print("=== DRY RUN MODE (use --execute to delete) ===\n")

    stats = cleanup(args.dir, args.expiry, dry_run)

    print(f"\n--- Summary ---")
    print(f"Scanned: {stats['scanned']} directories")
    print(f"Deleted: {stats['deleted']} directories")
    print(f"Freed:   {stats['freed_bytes'] / 1024 / 1024:.2f} MB")
    if stats['errors']:
        print(f"Errors:  {stats['errors']}")


if __name__ == '__main__':
    main()
