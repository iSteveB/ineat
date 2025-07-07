import { Card } from "@/components/ui/card"
import { Link } from '@tanstack/react-router'
import { Badge } from "@/components/ui/badge"

interface AddMethodCardProps {
  icon: React.ReactNode
  title: string
  description: string
  to: string
  isPremium?: boolean
  isDisabled?: boolean
}

export const AddMethodCard: React.FC<AddMethodCardProps> = ({
  icon,
  title,
  description,
  to,
  isPremium = false,
  isDisabled = false
}) => {
  const CardContent = (
    <Card className={`
      relative p-6 transition-all duration-200 border-2
      ${isDisabled 
        ? 'opacity-50 cursor-not-allowed border-neutral-200' 
        : 'hover:border-accent hover:shadow-md cursor-pointer border-transparent bg-neutral-50'
      }
    `}>
      {isPremium && (
        <Badge 
          variant="premium" 
          className="absolute top-4 right-4 bg-orange-500 text-neutral-50 px-2 py-1 text-xs font-medium rounded-full"
        >
          PRO
        </Badge>
      )}
      
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 size-12 bg-primary-100 rounded-full flex items-center justify-center">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-neutral-300 mb-2">
            {title}
          </h3>
          <p className="text-sm text-neutral-200 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Card>
  )

  if (isDisabled) {
    return CardContent
  }

  return (
    <Link to={to} className="block">
      {CardContent}
    </Link>
  )
}