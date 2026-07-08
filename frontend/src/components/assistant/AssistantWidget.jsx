import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Bot, RotateCcw, Send, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ConfirmationCard } from './ConfirmationCard'
import {
  sendMessage,
  resolveConfirmation,
  toggleAssistant,
  closeAssistant,
  resetConversation,
} from '../../store/assistantSlice'
import { fetchTransactions, fetchSummary } from '../../store/transactionSlice'
import { fetchCategories } from '../../store/categorySlice'
import { cn, getErrorMessage } from '../../lib/utils'

function Bubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
        )}
      >
        {text}
      </div>
    </div>
  )
}

export function AssistantWidget() {
  const dispatch = useDispatch()
  const { open, messages, pending, loading } = useSelector((s) => s.assistant)
  const categories = useSelector((s) => s.categories.categories)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending, loading])

  // The confirmation card's category dropdown needs the list loaded.
  useEffect(() => {
    if (open && pending && categories.length === 0) dispatch(fetchCategories())
  }, [open, pending, categories.length, dispatch])

  const refreshData = () => {
    dispatch(fetchTransactions())
    dispatch(fetchSummary())
  }

  const handleSend = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading || pending) return
    setInput('')
    try {
      await dispatch(sendMessage(text)).unwrap()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const handleDecision = async (decision, editedArgs) => {
    try {
      const result = await dispatch(resolveConfirmation({ decision, editedArgs })).unwrap()
      if (decision === 'confirm' && result.status === 'done') refreshData()
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!open) {
    return (
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={() => dispatch(toggleAssistant())}
        aria-label="Open assistant"
      >
        <Bot className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[24rem] max-w-[calc(100vw-3rem)] flex-col rounded-xl border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => dispatch(resetConversation())}
            aria-label="New conversation"
            title="New conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => dispatch(closeAssistant())}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !pending && (
          <p className="text-sm text-muted-foreground">
            Ask me things like &ldquo;how much did I spend this month?&rdquo; or &ldquo;add a 100 rupee
            groceries expense today&rdquo;. I&rsquo;ll ask you to review any change before saving it.
          </p>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role} text={m.text} />
        ))}
        {pending && (
          <ConfirmationCard
            key={pending.interruptId || 'pending'}
            pending={pending}
            busy={loading}
            onConfirm={(editedArgs) => handleDecision('confirm', editedArgs)}
            onCancel={() => handleDecision('cancel')}
          />
        )}
        {loading && <p className="text-xs text-muted-foreground">Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={pending ? 'Review the action above first…' : 'Type a message…'}
          disabled={loading || Boolean(pending)}
        />
        <Button type="submit" size="icon" disabled={loading || Boolean(pending) || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
