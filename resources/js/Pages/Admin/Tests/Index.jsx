import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { translateType, useI18n } from '@/lib/i18n';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ tests, filters }) {
    const { t } = useI18n();
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [type, setType] = useState(filters.type || '');

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(
            route('admin.tests.index'),
            { search, type },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                        {t('admin.tests.title')}
                    </h2>
                    <Link
                        href={route('admin.tests.create')}
                        className="atu-primary"
                    >
                        {t('admin.tests.create')}
                    </Link>
                </div>
            }
        >
            <Head title={t('admin.tests.title')} />

            <div className="atu-page">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash.status && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            {flash.status}
                        </div>
                    )}

                    <form
                        onSubmit={applyFilters}
                        className="atu-panel grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]"
                    >
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={t('common.search')}
                            className="atu-input"
                        />
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            className="atu-input"
                        >
                            <option value="">{t('common.allTypes')}</option>
                            {['psychology', 'social_survey'].map(
                                (value) => (
                                    <option key={value} value={value}>
                                        {translateType(t, value, true)}
                                    </option>
                                ),
                            )}
                        </select>
                        <button className="atu-secondary">
                            {t('common.filter')}
                        </button>
                    </form>

                    <section className="atu-panel">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="atu-table-head">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            {t('admin.tests.name')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('admin.tests.type')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('admin.tests.scoringMethod')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('admin.tests.questions')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('admin.tests.attempts')}
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {t('admin.tests.status')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tests.data.map((test) => (
                                        <tr key={test.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-[#274f93]">
                                                    {test.title}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {test.category ||
                                                        t(
                                                            'common.noCategory',
                                                        )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {translateType(
                                                    t,
                                                    test.type,
                                                    true,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <span className="rounded-md bg-[#edf3ff] px-2 py-1 text-xs font-medium text-[#274f93]">
                                                    {t(
                                                        `scoring.${test.scoring_rule?.method || 'simple_sum'}`,
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {test.questions_count}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {test.attempts_count}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        'rounded-full px-2 py-1 text-xs font-medium ' +
                                                        (test.is_active
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-gray-100 text-gray-600')
                                                    }
                                                >
                                                    {test.is_active
                                                        ? t('common.active')
                                                        : t('common.inactive')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
