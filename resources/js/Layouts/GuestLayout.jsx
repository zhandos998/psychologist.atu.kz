import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link, router, usePage } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    const { flash = {}, locale = 'ru' } = usePage().props;

    return (
        <div className="flex min-h-screen flex-col items-center bg-[#f4f7fc] pt-6 sm:justify-center sm:pt-0">
            <div className="flex flex-col items-center gap-4">
                <Link href="/">
                    <ApplicationLogo
                        variant="wordmark"
                        className="h-16 w-auto max-w-[260px]"
                        alt="Almaty Technological University"
                    />
                </Link>
                <LanguageSwitcher locale={locale} />
            </div>

            <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-sm ring-1 ring-[#dbe5f6] sm:max-w-md sm:rounded-lg">
                {flash.error && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                        {flash.error}
                    </div>
                )}

                {children}
            </div>
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
