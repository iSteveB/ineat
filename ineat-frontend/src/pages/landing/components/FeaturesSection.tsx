import {
	Activity,
	CalendarClock,
	ChefHat,
	Package,
	ScanLine,
	Wallet,
} from 'lucide-react';

import recipeDish from '@/assets/landing-recipe-dish.png';

const features = [
	{
		icon: Package,
		title: 'Inventaire alimentaire',
		description:
			'Retrouvez en un coup d’œil tout ce que vous avez à la maison, classé par emplacement et catégorie.',
	},
	{
		icon: ScanLine,
		title: 'Scan de produits',
		description:
			'Ajoutez un produit en scannant son code-barres. Nom, marque et infos sont remplis automatiquement.',
	},
	{
		icon: CalendarClock,
		title: 'Suivi des péremptions',
		description:
			'Chaque produit affiche sa date limite avec un indicateur clair, bien avant qu’il ne soit trop tard.',
	},
	{
		icon: Wallet,
		title: 'Budget mensuel',
		description:
			'Suivez vos dépenses alimentaires, catégorie par catégorie, et gardez la main sur votre budget.',
	},
	{
		icon: Activity,
		title: 'Informations nutritionnelles',
		description:
			'Consultez la qualité nutritionnelle de vos produits pour faire des choix plus éclairés.',
	},
	{
		icon: ChefHat,
		title: 'Recettes générées par IA',
		description:
			'Recevez des idées de repas adaptées à ce que vous avez déjà, sans course supplémentaire.',
	},
];

const availableIngredients = ['Poulet rôti', 'Riz', 'Courgette', 'Ail'];

const FeaturesSection = () => (
	<section id='fonctionnalites' className='bg-neutral-50 py-16 sm:py-24'>
		<div className='mx-auto max-w-7xl px-5 sm:px-8 lg:px-12'>
			<div className='mx-auto max-w-2xl text-center'>
				<span className='inline-flex items-center rounded-full bg-success-50/12 px-4 py-1.5 text-sm font-semibold text-success-50'>
					Fonctionnalités
				</span>
				<h2 className='mt-5 text-3xl font-semibold text-balance text-neutral-300 sm:text-4xl'>
					Tout ce qu’il faut pour gérer votre cuisine
				</h2>
				<p className='mt-4 text-lg leading-relaxed text-neutral-300/75'>
					Un assistant alimentaire simple et complet, du garde-manger jusqu’à l’assiette.
				</p>
			</div>

			<div className='mt-12 grid gap-5 lg:grid-cols-3'>
				{features.map((feature) => {
					const Icon = feature.icon;

					return (
						<article
							key={feature.title}
							className='rounded-2xl border border-neutral-200 bg-neutral-50 p-6 transition-shadow hover:shadow-md'>
							<div className='flex size-12 items-center justify-center rounded-xl bg-success-50/12 text-success-50'>
								<Icon className='size-6' />
							</div>
							<h3 className='mt-5 text-xl font-semibold text-neutral-300'>
								{feature.title}
							</h3>
							<p className='mt-2 leading-relaxed text-neutral-300/75'>
								{feature.description}
							</p>
						</article>
					);
				})}
			</div>

			<div className='mt-6 grid items-center gap-8 overflow-hidden rounded-3xl border border-neutral-200 bg-primary-50 p-6 sm:p-10 lg:grid-cols-2'>
				<div>
					<span className='inline-flex items-center gap-2 rounded-full bg-[#F2A400]/15 px-4 py-1.5 text-sm font-semibold text-[#B87400]'>
						<ChefHat className='size-4' />
						Recettes par IA
					</span>
					<h3 className='mt-5 text-2xl font-semibold text-balance text-neutral-300 sm:text-3xl'>
						Que peut-on cuisiner ce soir ?
					</h3>
					<p className='mt-4 text-lg leading-relaxed text-neutral-300/80'>
						InEat propose des recettes réalisables avec ce que vous avez déjà. Une fois
						le plat cuisiné, les ingrédients utilisés sont retirés de votre inventaire.
					</p>
					<div className='mt-6'>
						<p className='text-sm font-semibold text-neutral-300/70'>
							À partir de votre inventaire
						</p>
						<ul className='mt-3 flex flex-wrap gap-2'>
							{availableIngredients.map((ingredient) => (
								<li
									key={ingredient}
									className='rounded-full bg-success-50/12 px-3 py-1.5 text-sm font-medium text-success-50'>
									{ingredient}
								</li>
							))}
						</ul>
					</div>
				</div>

				<div className='relative'>
					<img
						src={recipeDish}
						alt='Un plat maison de poulet rôti, riz et légumes préparé à partir de l’inventaire InEat'
						className='mx-auto aspect-4/3 w-full max-w-md rounded-2xl object-cover shadow-lg'
						loading='lazy'
					/>
					<div className='absolute bottom-4 left-4 rounded-xl bg-neutral-50/95 px-4 py-3 shadow-md backdrop-blur'>
						<p className='text-sm font-semibold text-neutral-300'>
							Poulet rôti & légumes
						</p>
						<p className='text-xs text-neutral-300/65'>35 min · Facile · 4 portions</p>
					</div>
				</div>
			</div>
		</div>
	</section>
);

export default FeaturesSection;
