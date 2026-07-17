import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { useI18n } from '@/lib/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { locale, t } = useI18n();
    const page = usePage();
    const user = page.props.auth.user;
    const flash = page.props.flash || {};
    const canManageTests = ['admin', 'psychologist'].includes(user.role);
    const canViewResults = ['admin', 'psychologist', 'ddm_staff'].includes(
        user.role,
    );

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    return (
        <div className="min-h-screen bg-[#f4f7fc]">
            <nav className="border-b border-[#dbe5f6] bg-white">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/">
                                    <ApplicationLogo
                                        variant="wordmark"
                                        className="block h-9 w-auto max-w-[150px]"
                                        alt="Almaty Technological University"
                                    />
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    {t('nav.dashboard')}
                                </NavLink>
                                <NavLink
                                    href={route('tests.index')}
                                    active={route().current('tests.*')}
                                >
                                    {t('nav.tests')}
                                </NavLink>
                                {canManageTests && (
                                    <NavLink
                                        href={route('admin.tests.index')}
                                        active={route().current(
                                            'admin.tests.*',
                                        )}
                                    >
                                        {t('nav.builder')}
                                    </NavLink>
                                )}
                                {canViewResults && (
                                    <NavLink
                                        href={route('admin.results.index')}
                                        active={route().current(
                                            'admin.results.*',
                                        )}
                                    >
                                        {t('nav.results')}
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center sm:gap-3">
                            <LanguageSwitcher locale={locale} />

                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-md border border-transparent bg-white px-3 py-2 text-sm font-medium leading-4 text-[#355da8] transition duration-150 ease-in-out hover:text-[#2f5192] focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                        >
                                            {t('nav.profile')}
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                        >
                                            {t('nav.logout')}
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-[#355da8] transition duration-150 ease-in-out hover:bg-[#f4f7fc] hover:text-[#2f5192] focus:bg-[#f4f7fc] focus:text-[#2f5192] focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                        >
                            {t('nav.dashboard')}
                        </ResponsiveNavLink>
                        <ResponsiveNavLink
                            href={route('tests.index')}
                            active={route().current('tests.*')}
                        >
                            {t('nav.tests')}
                        </ResponsiveNavLink>
                        {canManageTests && (
                            <ResponsiveNavLink
                                href={route('admin.tests.index')}
                                active={route().current('admin.tests.*')}
                            >
                                {t('nav.builder')}
                            </ResponsiveNavLink>
                        )}
                        {canViewResults && (
                            <ResponsiveNavLink
                                href={route('admin.results.index')}
                                active={route().current('admin.results.*')}
                            >
                                {t('nav.results')}
                            </ResponsiveNavLink>
                        )}
                    </div>

                    <div className="border-t border-[#dbe5f6] pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-gray-800">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-gray-500">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <div className="px-4 pb-2">
                                <LanguageSwitcher locale={locale} />
                            </div>
                            <ResponsiveNavLink href={route('profile.edit')}>
                                {t('nav.profile')}
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                            >
                                {t('nav.logout')}
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white shadow-sm">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            {flash.error && (
                <div className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                        {flash.error}
                    </div>
                </div>
            )}

            <main>{children}</main>
        </div>
    );
}

function LanguageSwitcher({ locale }) {
    const switchLocale = (nextLocale) => {
        if (nextLocale === locale) {
            return;
        }

        router.post(
            route('locale.switch', nextLocale),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <div className="inline-flex rounded-md border border-[#dbe5f6] bg-white p-1 shadow-sm">
            {['ru', 'kk'].map((item) => (
                <button
                    key={item}
                    type="button"
                    onClick={() => switchLocale(item)}
                    className={
                        'rounded px-2.5 py-1 text-xs font-semibold transition ' +
                        (locale === item
                            ? 'bg-[#355da8] text-white'
                            : 'text-[#355da8] hover:bg-[#f4f7fc]')
                    }
                >
                    {item === 'ru' ? 'RU' : 'KZ'}
                </button>
            ))}
        </div>
    );
}
