import { Link } from '@tanstack/react-router';

import logo from '@/assets/Logo.svg';

const Logo = () => (
	<Link to='/app' aria-label='InEat, accueil' className='rounded-md'>
		<img src={logo} alt='' className='h-10 w-auto' />
	</Link>
);

export default Logo;
