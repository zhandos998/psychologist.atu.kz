import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { translateType, useI18n } from '@/lib/i18n';
import { Head, Link } from '@inertiajs/react';

export default function Index({ tests }) {
    const { t } = useI18n();

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                    {t('tests.title')}
                </h2>
            }
        >
            <Head title={t('tests.indexTitle')} />

            <div className="atu-page">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {tests.map((test) => (
                            <article
                                key={test.id}
                                className="atu-panel flex h-full flex-col p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-medium uppercase tracking-wide text-[#355da8]">
                                            {translateType(t, test.type)}
                                        </div>
                                        <h3 className="mt-2 text-lg font-semibold text-[#274f93]">
                                            {test.title}
                                        </h3>
                                    </div>
                                    {test.is_required && (
                                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                            {t('common.required')}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                                    {test.description ||
                                        t('common.noDescription')}
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-5 text-xs text-gray-500">
                                    <span>
                                        {test.category ||
                                            t('common.noCategory')}
                                    </span>
                                    <span>·</span>
                                    <span>
                                        {test.questions_count}{' '}
                                        {t('common.questions')}
                                    </span>
                                    {test.completed_at && (
                                        <>
                                            <span>·</span>
                                            <span>{t('common.completed')}</span>
                                        </>
                                    )}
                                </div>
                                <div className="pt-5">
                                    <Link
                                        href={route('tests.show', test.id)}
                                        className="atu-primary w-full"
                                    >
                                        {test.completed_at
                                            ? t('common.retry')
                                            : t('common.open')}
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
