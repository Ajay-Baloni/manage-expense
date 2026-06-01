import Transactions from './Transactions'

export default function Income() {
  return (
    <Transactions
      defaultType="income"
      title="Income"
      description="Track and manage all your income sources."
    />
  )
}
