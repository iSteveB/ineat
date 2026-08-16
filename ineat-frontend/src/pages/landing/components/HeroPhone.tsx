import {
	ArrowRight,
	Bell,
	Home,
	Package,
	Plus,
	ShoppingBasket,
	User,
} from 'lucide-react';

const inventoryItems = [
	{ name: 'Yaourt nature', qty: '2 unités', delay: '6 jours', tone: 'bg-success-50/15 text-success-50' },
	{ name: 'Salade verte', qty: '1 pièce', delay: '2 jours', tone: 'bg-primary-100/25 text-[#D99100]' },
	{ name: 'Poulet rôti', qty: '1 pièce', delay: "Aujourd'hui", tone: 'bg-error-50/15 text-error-100' },
	{ name: 'Lait demi-écrémé', qty: '1 L', delay: '8 jours', tone: 'bg-success-50/15 text-success-50' },
];

const HeroPhone = () => (
	<div
		aria-label='Aperçu mobile InEat avec inventaire, alertes de péremption et budget'
		className='relative mx-auto w-[286px] rounded-[2.2rem] border-[7px] border-neutral-300 bg-neutral-50 p-4 shadow-2xl sm:w-[342px] sm:rounded-[2.7rem] sm:border-[9px] sm:p-5'>
		<div className='absolute left-1/2 top-0 h-7 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-300 sm:w-32' />

		<div className='pt-8'>
			<div className='mb-5 flex items-center justify-between'>
				<div>
					<p className='text-xs font-semibold text-neutral-300/70'>9:41</p>
					<p className='mt-3 text-lg font-semibold text-neutral-300'>Bonjour !</p>
				</div>
				<div className='relative flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-300'>
					<Bell className='size-5' />
					<span className='absolute right-1 top-1 size-2 rounded-full bg-error-50' />
				</div>
			</div>

			<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-sm'>
				<div className='mb-3 flex items-center justify-between'>
					<h2 className='text-sm font-semibold text-neutral-300'>Mon inventaire</h2>
					<span className='text-xs text-neutral-300/55'>Voir tout</span>
				</div>
				<div className='space-y-2'>
					{inventoryItems.map((item) => (
						<div key={item.name} className='flex items-center gap-2 rounded-md bg-neutral-100/80 p-2'>
							<div className='flex size-9 items-center justify-center rounded-md bg-primary-100/25 text-lg'>
								<Package className='size-4 text-success-50' />
							</div>
							<div className='min-w-0 flex-1'>
								<p className='truncate text-xs font-semibold text-neutral-300'>{item.name}</p>
								<p className='text-[0.68rem] text-neutral-300/55'>{item.qty}</p>
							</div>
							<span className={`rounded-md px-2 py-1 text-[0.65rem] font-semibold ${item.tone}`}>
								{item.delay}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className='mt-3 rounded-lg border border-orange-100 bg-orange-50/70 p-3'>
				<div className='mb-2 flex items-center justify-between'>
					<h2 className='text-sm font-semibold text-neutral-300'>Alertes péremption</h2>
					<span className='text-xs text-neutral-300/55'>Voir tout</span>
				</div>
				<div className='space-y-2'>
					<div className='flex items-center justify-between rounded-md bg-neutral-50 p-2'>
						<div>
							<p className='text-xs font-semibold text-neutral-300'>Poulet rôti</p>
							<p className='text-[0.68rem] text-neutral-300/55'>À consommer aujourd’hui</p>
						</div>
						<ArrowRight className='size-4 text-error-50' />
					</div>
					<div className='flex items-center justify-between rounded-md bg-neutral-50 p-2'>
						<div>
							<p className='text-xs font-semibold text-neutral-300'>Fromage frais</p>
							<p className='text-[0.68rem] text-neutral-300/55'>À consommer dans 1 jour</p>
						</div>
						<ArrowRight className='size-4 text-neutral-300/40' />
					</div>
				</div>
			</div>

			<div className='mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-sm'>
				<div className='flex items-center justify-between'>
					<div>
						<h2 className='text-sm font-semibold text-neutral-300'>Mon budget</h2>
						<p className='text-[0.68rem] text-neutral-300/55'>Mai 2026</p>
					</div>
					<ArrowRight className='size-4 text-neutral-300/45' />
				</div>
				<p className='mt-2 text-xl font-semibold text-neutral-300'>245 €</p>
				<p className='text-[0.68rem] text-neutral-300/55'>dépensés sur 400 €</p>
				<div className='mt-3 h-2 rounded-full bg-neutral-200'>
					<div className='h-full w-[61%] rounded-full bg-success-50' />
				</div>
				<p className='mt-1 text-right text-[0.68rem] font-semibold text-success-50'>61 %</p>
			</div>

			<div className='mt-4 grid grid-cols-5 items-center text-neutral-300/55'>
				<Home className='mx-auto size-5 text-[#F2A400]' />
				<Package className='mx-auto size-5' />
				<div className='mx-auto flex size-11 items-center justify-center rounded-full bg-success-50 text-neutral-50'>
					<Plus className='size-6' />
				</div>
				<ShoppingBasket className='mx-auto size-5' />
				<User className='mx-auto size-5' />
			</div>
		</div>
	</div>
);

export default HeroPhone;
