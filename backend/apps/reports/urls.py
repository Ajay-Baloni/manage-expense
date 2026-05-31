from django.urls import path
from .views import ImportCSVView, ExportCSVView, ExportPDFView, ImportJobListView

urlpatterns = [
    path('import/csv/', ImportCSVView.as_view(), name='import_csv'),
    path('export/csv/', ExportCSVView.as_view(), name='export_csv'),
    path('export/pdf/', ExportPDFView.as_view(), name='export_pdf'),
    path('import/jobs/', ImportJobListView.as_view(), name='import_jobs'),
]
