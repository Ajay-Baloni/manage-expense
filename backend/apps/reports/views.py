import csv
import io
from datetime import datetime, date

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from django.http import HttpResponse

from apps.transactions.models import Transaction
from apps.categories.models import Category
from .models import ImportJob


class ImportCSVView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        job = ImportJob.objects.create(
            user=request.user,
            file_name=file.name,
            status='processing',
        )

        errors = []
        imported = 0
        total = 0

        try:
            content = file.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
            rows = list(reader)
            total = len(rows)

            for i, row in enumerate(rows):
                try:
                    # Normalize keys
                    row = {k.strip().lower(): v.strip() for k, v in row.items()}

                    # Required: date, amount, description
                    raw_date = row.get('date', '')
                    raw_amount = row.get('amount', '')
                    description = row.get('description', '') or row.get('name', '') or 'Imported'

                    if not raw_date or not raw_amount:
                        errors.append({'row': i + 2, 'error': 'Missing date or amount'})
                        continue

                    # Parse date
                    parsed_date = None
                    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%d-%m-%Y', '%m-%d-%Y'):
                        try:
                            parsed_date = datetime.strptime(raw_date, fmt).date()
                            break
                        except ValueError:
                            continue
                    if not parsed_date:
                        errors.append({'row': i + 2, 'error': f'Invalid date format: {raw_date}'})
                        continue

                    # Parse amount
                    try:
                        amount = abs(float(raw_amount.replace(',', '').replace('$', '').strip()))
                    except ValueError:
                        errors.append({'row': i + 2, 'error': f'Invalid amount: {raw_amount}'})
                        continue

                    # Type
                    raw_type = row.get('type', 'expense').lower()
                    t_type = 'income' if raw_type in ('income', 'credit', 'deposit') else 'expense'

                    # Category
                    category = None
                    cat_name = row.get('category', '')
                    if cat_name:
                        from django.db.models import Q
                        category = Category.objects.filter(
                            Q(user=request.user) | Q(user__isnull=True),
                            name__iexact=cat_name
                        ).first()
                        if not category:
                            category = Category.objects.create(
                                user=request.user,
                                name=cat_name,
                                type=t_type,
                            )

                    Transaction.objects.create(
                        user=request.user,
                        type=t_type,
                        amount=amount,
                        category=category,
                        date=parsed_date,
                        description=description,
                    )
                    imported += 1

                except Exception as e:
                    errors.append({'row': i + 2, 'error': str(e)})

        except Exception as e:
            job.status = 'failed'
            job.errors_json = [{'row': 0, 'error': str(e)}]
            job.save()
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        job.status = 'completed'
        job.total_rows = total
        job.imported_rows = imported
        job.errors_json = errors
        job.save()

        return Response({
            'job_id': job.id,
            'total_rows': total,
            'imported_rows': imported,
            'error_count': len(errors),
            'errors': errors[:20],
        })


class ExportCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.filter(user=request.user).select_related('category').order_by('-date')

        # Apply filters
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        t_type = request.query_params.get('type')
        category_id = request.query_params.get('category')

        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if t_type:
            qs = qs.filter(type=t_type)
        if category_id:
            qs = qs.filter(category_id=category_id)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['date', 'type', 'amount', 'category', 'description', 'notes'])
        for t in qs:
            writer.writerow([
                t.date.strftime('%Y-%m-%d'),
                t.type,
                t.amount,
                t.category.name if t.category else '',
                t.description,
                t.notes,
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
        return response


class ExportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from django.db.models import Sum

        qs = Transaction.objects.filter(user=request.user).select_related('category').order_by('-date')

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        t_type = request.query_params.get('type')

        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if t_type:
            qs = qs.filter(type=t_type)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph('Expense Report', styles['Title']))
        elements.append(Spacer(1, 12))

        user = request.user
        total_income = float(qs.filter(type='income').aggregate(t=Sum('amount'))['t'] or 0)
        total_expense = float(qs.filter(type='expense').aggregate(t=Sum('amount'))['t'] or 0)

        summary_data = [
            ['Summary', ''],
            ['Total Income', f'${total_income:,.2f}'],
            ['Total Expense', f'${total_expense:,.2f}'],
            ['Net Balance', f'${total_income - total_expense:,.2f}'],
        ]
        summary_table = Table(summary_data, colWidths=[200, 200])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))

        elements.append(Paragraph('Transactions', styles['Heading2']))
        data = [['Date', 'Type', 'Amount', 'Category', 'Description']]
        for t in qs[:200]:
            data.append([
                t.date.strftime('%Y-%m-%d'),
                t.type.capitalize(),
                f'${t.amount:,.2f}',
                t.category.name if t.category else '-',
                t.description[:40],
            ])

        table = Table(data, colWidths=[70, 60, 80, 100, 160])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="expense_report.pdf"'
        return response


class ImportJobListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        jobs = ImportJob.objects.filter(user=request.user)[:20]
        data = [{
            'id': j.id,
            'file_name': j.file_name,
            'status': j.status,
            'total_rows': j.total_rows,
            'imported_rows': j.imported_rows,
            'error_count': len(j.errors_json),
            'created_at': j.created_at,
        } for j in jobs]
        return Response(data)
