import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import React from 'react';

interface AddMethodCardProps {
	icon: React.ReactNode;
	title: string;
	description: string;
	to: string;
	isPremium?: boolean;
	isDisabled?: boolean;
	onClick?: () => void;
}

const AddMethodCard: React.FC<AddMethodCardProps> = ({
	icon,
	title,
	description,
	to,
	isPremium = false,
	isDisabled = false,
	onClick,
}) => {
	const content = (
		<Card
			className={cn(
				'relative overflow-hidden border-0 shadow-lg transition-all duration-300',
				'bg-gradient-to-br from-white to-gray-50/50',
				isDisabled && 'opacity-50 cursor-not-allowed',
				!isDisabled && 'hover:shadow-xl hover:scale-[1.01]'
			)}>
			<div className='absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-2xl -translate-y-8 translate-x-8' />
			<CardContent className='p-6 flex items-center gap-4'>
				<div className='flex-shrink-0 size-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center'>
					{icon}
				</div>
				<div className='flex-1'>
					<h3 className='text-lg font-semibold text-gray-900 mb-1'>
						{title}
					</h3>
					<p className='text-sm text-gray-600 leading-relaxed'>
						{description}
					</p>
				</div>
				{isPremium && (
					<div className='flex-shrink-0 px-3 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1'>
						<Lock className='size-3' />
						<span>Premium</span>
					</div>
				)}
			</CardContent>
		</Card>
	);

	if (isDisabled) {
		return (
			<div className='cursor-not-allowed' onClick={onClick}>
				{content}
			</div>
		);
	}

	if (to) {
		return (
			<Link to={to} className='block' onClick={onClick}>
				{content}
			</Link>
		);
	}

	return (
		<div className='block' onClick={onClick}>
			{content}
		</div>
	);
};

export default AddMethodCard;
