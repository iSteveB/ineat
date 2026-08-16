import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
	{
		question: 'Combien de temps faut-il pour gérer mon inventaire ?',
		answer:
			'Quelques secondes par produit. Le scan de code-barres remplit automatiquement le nom, la marque et les informations du produit. Vous pouvez aussi ajouter vos courses en une fois après vos achats.',
	},
	{
		question: 'Mes données personnelles sont-elles protégées ?',
		answer:
			'Oui. Vos données d’inventaire et de budget vous appartiennent, restent confidentielles et ne sont jamais revendues. Vous pouvez les exporter ou supprimer votre compte à tout moment.',
	},
	{
		question: 'Comment fonctionne le scan des produits ?',
		answer:
			'Il vous suffit de pointer votre téléphone vers le code-barres. InEat identifie le produit et pré-remplit sa fiche. S’il n’est pas reconnu, vous pouvez le compléter manuellement en quelques secondes.',
	},
	{
		question: 'Comment sont déclenchées les alertes de péremption ?',
		answer:
			'InEat surveille les dates limites de vos produits et vous prévient avant qu’ils n’expirent, au bon moment pour les consommer. Vous restez maître de la fréquence des notifications.',
	},
	{
		question: 'Les recettes générées par IA sont-elles fiables ?',
		answer:
			'Les recettes sont proposées à partir des produits réellement présents dans votre inventaire et de vos préférences alimentaires. Chaque recette indique les ingrédients disponibles et ceux qui manquent.',
	},
	{
		question: 'L’abonnement est-il obligatoire ?',
		answer:
			'Non. L’offre gratuite couvre l’inventaire, les alertes et le budget. L’offre Premium est optionnelle, sans engagement, et peut être annulée à tout moment.',
	},
];

const FaqSection = () => (
	<section id='faq' className='bg-neutral-50 py-16 sm:py-24'>
		<div className='mx-auto max-w-3xl px-5 sm:px-8'>
			<div className='text-center'>
				<span className='inline-flex items-center rounded-full bg-success-50/12 px-4 py-1.5 text-sm font-semibold text-success-50'>
					FAQ
				</span>
				<h2 className='mt-5 text-3xl font-semibold text-balance text-neutral-300 sm:text-4xl'>
					Vos questions, nos réponses
				</h2>
			</div>

			<Accordion type='single' collapsible className='mt-10'>
				{faqs.map((faq) => (
					<AccordionItem
						key={faq.question}
						value={faq.question}
						className='border-b border-neutral-200'>
						<AccordionTrigger className='py-5 text-left text-lg font-semibold text-neutral-300 hover:no-underline'>
							{faq.question}
						</AccordionTrigger>
						<AccordionContent className='pb-5 text-base leading-relaxed text-neutral-300/80'>
							{faq.answer}
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	</section>
);

export default FaqSection;
