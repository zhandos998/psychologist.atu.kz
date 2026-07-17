import ApplicationLogo from '@/Components/ApplicationLogo';
import { useI18n } from '@/lib/i18n';
import { Head, Link, usePage } from '@inertiajs/react';

const messages = {
    403: {
        title: 'error.403.title',
        text: 'error.403.text',
    },
    404: {
        title: 'error.404.title',
        text: 'error.404.text',
    },
    500: {
        title: 'error.500.title',
        text: 'error.500.text',
    },
    503: {
        title: 'error.503.title',
        text: 'error.503.text',
    },
};

export default function Error({ status }) {
    const { t } = useI18n();
    const user = usePage().props.auth?.user;
    const content = messages[status] || messages[500];

    return (
        <div className="min-h-screen bg-[#f4f7fc]">
            <Head title={`${status} ${t(content.title)}`} />

            <main className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <ApplicationLogo
                        variant="wordmark"
                        className="h-12 w-auto max-w-[220px]"
                        alt="Almaty Technological University"
                    />
                </div>

                <section className="rounded-lg border border-[#dbe5f6] bg-white p-8 shadow-sm">
                    <div className="text-sm font-semibold text-[#355da8]">
                        {status}
                    </div>
                    <h1 className="mt-3 text-2xl font-semibold text-[#274f93]">
                        {t(content.title)}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                        {t(content.text)}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="atu-secondary px-4 py-2"
                        >
                            {t('common.back')}
                        </button>
                        <Link
                            href={user ? route('dashboard') : route('login')}
                            className="atu-primary px-4 py-2"
                        >
                            {user ? t('nav.dashboard') : t('auth.login')}
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
