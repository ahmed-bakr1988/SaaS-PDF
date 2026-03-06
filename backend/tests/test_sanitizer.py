"""Tests for sanitizer utilities — generate_safe_path, get_output_path, cleanup."""
import os
from app.utils.sanitizer import generate_safe_path, get_output_path, cleanup_task_files


class TestGenerateSafePath:
    def test_returns_tuple(self, app):
        """Should return (task_id, file_path) tuple."""
        with app.app_context():
            task_id, path = generate_safe_path('pdf', folder_type='upload')
            assert isinstance(task_id, str)
            assert isinstance(path, str)

    def test_uuid_in_path(self, app):
        """Path should contain the UUID task_id."""
        with app.app_context():
            task_id, path = generate_safe_path('pdf')
            assert task_id in path

    def test_correct_extension(self, app):
        """Path should end with the specified extension."""
        with app.app_context():
            _, path = generate_safe_path('docx')
            assert path.endswith('.docx')

    def test_upload_folder(self, app):
        """upload folder_type should use UPLOAD_FOLDER config."""
        with app.app_context():
            _, path = generate_safe_path('pdf', folder_type='upload')
            assert app.config['UPLOAD_FOLDER'] in path

    def test_output_folder(self, app):
        """output folder_type should use OUTPUT_FOLDER config."""
        with app.app_context():
            _, path = generate_safe_path('pdf', folder_type='output')
            assert app.config['OUTPUT_FOLDER'] in path


class TestGetOutputPath:
    def test_returns_correct_path(self, app):
        """Should return path in OUTPUT_FOLDER with task_id and extension."""
        with app.app_context():
            path = get_output_path('my-task-id', 'pdf')
            assert 'my-task-id' in path
            assert path.endswith('.pdf')
            assert app.config['OUTPUT_FOLDER'] in path


class TestCleanupTaskFiles:
    def test_cleanup_removes_upload_dir(self, app):
        """Should remove upload directory for the task."""
        with app.app_context():
            task_id = 'cleanup-test-id'
            upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], task_id)
            os.makedirs(upload_dir, exist_ok=True)

            # Create a test file
            with open(os.path.join(upload_dir, 'test.pdf'), 'w') as f:
                f.write('test')

            cleanup_task_files(task_id)
            assert not os.path.exists(upload_dir)

    def test_cleanup_keeps_outputs_when_requested(self, app):
        """Should keep output directory when keep_outputs=True."""
        with app.app_context():
            task_id = 'keep-output-id'
            output_dir = os.path.join(app.config['OUTPUT_FOLDER'], task_id)
            os.makedirs(output_dir, exist_ok=True)
            with open(os.path.join(output_dir, 'out.pdf'), 'w') as f:
                f.write('test')

            cleanup_task_files(task_id, keep_outputs=True)
            assert os.path.exists(output_dir)