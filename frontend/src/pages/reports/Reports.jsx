import { useState, useEffect } from 'react'
import { Upload, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { reportsApi } from '../../api/reports'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { PageHeader } from '../../components/layout/PageHeader'
import { getErrorMessage } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function Reports() {
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [exportFilters, setExportFilters] = useState({ date_from: '', date_to: '', type: '' })
  const [jobs, setJobs] = useState([])

  useEffect(() => {
    reportsApi.listImportJobs().then((r) => setJobs(r.data)).catch(() => {})
  }, [])

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportLoading(true)
    setImportResult(null)
    try {
      const res = await reportsApi.importCSV(file)
      setImportResult(res.data)
      toast.success(`Imported ${res.data.imported_rows} of ${res.data.total_rows} rows`)
      reportsApi.listImportJobs().then((r) => setJobs(r.data)).catch(() => {})
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setImportLoading(false)
      e.target.value = ''
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = Object.fromEntries(Object.entries(exportFilters).filter(([_, v]) => v))
      const res = await reportsApi.exportCSV(params)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transactions.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV exported')
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  const handleExportPDF = async () => {
    try {
      const params = Object.fromEntries(Object.entries(exportFilters).filter(([_, v]) => v))
      const res = await reportsApi.exportPDF(params)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'expense_report.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF exported')
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Import transactions from CSV and export your data."
      />
      <div className="grid md:grid-cols-2 gap-4">
        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4" />Import CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import transactions from a CSV file. Expected columns: <code className="bg-muted px-1 rounded">date, amount, description, category, type</code>
            </p>
            <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${importLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}`}>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">{importLoading ? 'Importing...' : 'Click to upload CSV'}</p>
              <p className="text-xs text-muted-foreground">CSV files only</p>
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importLoading} />
            </label>

            {importResult && (
              <div className={`p-3 rounded-md text-sm ${importResult.error_count === 0 ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
                <div className="flex items-center gap-2 font-medium mb-1">
                  {importResult.error_count === 0 ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  Imported {importResult.imported_rows}/{importResult.total_rows} rows
                  {importResult.error_count > 0 && `, ${importResult.error_count} errors`}
                </div>
                {importResult.errors?.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs">Row {e.row}: {e.error}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4" />Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">From Date</Label>
                <Input type="date" className="h-9" value={exportFilters.date_from} onChange={(e) => setExportFilters((f) => ({ ...f, date_from: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">To Date</Label>
                <Input type="date" className="h-9" value={exportFilters.date_to} onChange={(e) => setExportFilters((f) => ({ ...f, date_to: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type</Label>
                <Select
                  value={exportFilters.type || 'all'}
                  onValueChange={(v) => setExportFilters((f) => ({ ...f, type: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />CSV
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import history */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Import History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                  <div>
                    <p className="font-medium">{job.file_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : job.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {job.status}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.imported_rows}/{job.total_rows} imported</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
