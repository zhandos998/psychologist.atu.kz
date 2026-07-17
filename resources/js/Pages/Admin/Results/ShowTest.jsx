import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/dates';
import { useI18n } from '@/lib/i18n';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function ShowTest({ testItem, questions, attempts, filters }) {
    const { locale, t } = useI18n();
    const [form, setForm] = useState({
        faculty: filters.faculty || '',
        group_name: filters.group_name || '',
        student: filters.student || '',
        risk: filters.risk ?? '',
        date_from: filters.date_from || '',
        date_to: filters.date_to || '',
        sort: filters.sort || 'finished_at',
        direction: filters.direction || 'desc',
    });
    const query = cleanQuery(form);
    const rows = attempts.data || [];

    const setField = (field, value) =>
        setForm((current) => ({ ...current, [field]: value }));

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(route('admin.results.tests.show', testItem.id), query, {
            preserveState: true,
            replace: true,
        });
    };

    const sortBy = (sort) => {
        const direction =
            form.sort === sort && form.direction === 'asc' ? 'desc' : 'asc';
        const next = cleanQuery({ ...form, sort, direction });

        setForm((current) => ({ ...current, sort, direction }));
        router.get(route('admin.results.tests.show', testItem.id), next, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                            {t('admin.results.testReport')}
                        </h2>
                        <div className="text-sm text-gray-500">
                            {testItem.title}
                        </div>
                    </div>
                    <Link
                        href={route('admin.results.index')}
                        className="atu-secondary"
                    >
                        {t('admin.results.backToResults')}
                    </Link>
                </div>
            }
        >
            <Head title={`${t('admin.results.testReport')}: ${testItem.title}`} />

            <div className="atu-page">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    <form
                        onSubmit={applyFilters}
                        className="atu-panel grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-7"
                    >
                        <input
                            value={form.faculty}
                            onChange={(event) =>
                                setField('faculty', event.target.value)
                            }
                            placeholder={t('common.faculty')}
                            className="atu-input"
                        />
                        <input
                            value={form.group_name}
                            onChange={(event) =>
                                setField('group_name', event.target.value)
                            }
                            placeholder={t('common.group')}
                            className="atu-input"
                        />
                        <input
                            value={form.student}
                            onChange={(event) =>
                                setField('student', event.target.value)
                            }
                            placeholder={t('common.student')}
                            className="atu-input"
                        />
                        <select
                            value={form.risk}
                            onChange={(event) =>
                                setField('risk', event.target.value)
                            }
                            className="atu-input"
                        >
                            <option value="">{t('common.anyRisk')}</option>
                            <option value="1">{t('common.highRisk')}</option>
                            <option value="0">{t('common.noHighRisk')}</option>
                        </select>
                        <input
                            type="date"
                            value={form.date_from}
                            onChange={(event) =>
                                setField('date_from', event.target.value)
                            }
                            aria-label={t('admin.results.dateFrom')}
                            className="atu-input"
                        />
                        <input
                            type="date"
                            value={form.date_to}
                            onChange={(event) =>
                                setField('date_to', event.target.value)
                            }
                            aria-label={t('admin.results.dateTo')}
                            className="atu-input"
                        />
                        <button className="atu-secondary">
                            {t('common.apply')}
                        </button>
                    </form>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-gray-600">
                            {t('admin.results.total')}: {attempts.total}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={route(
                                    'admin.results.tests.show',
                                    testItem.id,
                                )}
                                className="atu-secondary"
                            >
                                {t('common.reset')}
                            </Link>
                            <a
                                href={route(
                                    'admin.results.tests.export.csv',
                                    { test: testItem.id, ...query },
                                )}
                                className="atu-secondary"
                            >
                                CSV
                            </a>
                            <a
                                href={route(
                                    'admin.results.tests.export.xlsx',
                                    { test: testItem.id, ...query },
                                )}
                                className="atu-secondary"
                            >
                                Excel
                            </a>
                        </div>
                    </div>

                    <section className="atu-panel">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="atu-table-head">
                                    <tr>
                                        <SortableHeader
                                            label={t('common.student')}
                                            sort="student"
                                            currentSort={form.sort}
                                            direction={form.direction}
                                            onSort={sortBy}
                                        />
                                        <SortableHeader
                                            label={t('common.faculty')}
                                            sort="faculty"
                                            currentSort={form.sort}
                                            direction={form.direction}
                                            onSort={sortBy}
                                        />
                                        <SortableHeader
                                            label={t('common.group')}
                                            sort="group"
                                            currentSort={form.sort}
                                            direction={form.direction}
                                            onSort={sortBy}
                                        />
                                        <SortableHeader
                                            label={t('common.score')}
                                            sort="score"
                                            currentSort={form.sort}
                                            direction={form.direction}
                                            onSort={sortBy}
                                        />
                                        <SortableHeader
                                            label={t('common.risk')}
                                            sort="risk"
                                            currentSort={form.sort}
                                            direction={form.direction}
                                            onSort={sortBy}
                                        />
                                        <SortableHeader
                                            label={t('common.date')}
                                            sort="finished_at"
                                            currentSort={form.sort}
                                            direction={form.direction}
                                            onSort={sortBy}
                                        />
                                        {questions.map((question) => (
                                            <th
                                                key={question.id}
                                                className="min-w-64 px-4 py-3 text-left font-medium"
                                            >
                                                {question.text}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((attempt) => (
                                        <tr key={attempt.id}>
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-medium text-[#274f93]">
                                                    {attempt.user.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {attempt.user.email}
                                                </div>
                                                {attempt.user.iin && (
                                                    <div className="text-xs text-gray-500">
                                                        IIN: {attempt.user.iin}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-700">
                                                {attempt.user.faculty ||
                                                    t('common.dash')}
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-700">
                                                {attempt.user.group_name ||
                                                    t('common.dash')}
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-700">
                                                {attempt.total_score ??
                                                    t('common.dash')}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <span
                                                    className={
                                                        'rounded-full px-2 py-1 text-xs font-medium ' +
                                                        (attempt.is_high_risk
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-emerald-100 text-emerald-700')
                                                    }
                                                >
                                                    {attempt.is_high_risk
                                                        ? t('common.highRisk')
                                                        : t('common.none')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-500">
                                                {formatDateTime(
                                                    attempt.finished_at,
                                                    locale,
                                                )}
                                            </td>
                                            {questions.map((question) => (
                                                <td
                                                    key={question.id}
                                                    className="min-w-64 px-4 py-3 align-top text-gray-700"
                                                >
                                                    {attempt.answers?.[
                                                        question.id
                                                    ] || t('common.dash')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}

                                    {rows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6 + questions.length}
                                                className="px-4 py-8 text-center text-gray-500"
                                            >
                                                {t('admin.results.empty')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {attempts.links?.length > 3 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
                                <div className="text-sm text-gray-500">
                                    {attempts.from || 0}-{attempts.to || 0} /{' '}
                                    {attempts.total}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {attempts.links.map((link, index) => (
                                        <PaginationLink
                                            key={`${link.label}-${index}`}
                                            link={link}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function SortableHeader({ label, sort, currentSort, direction, onSort }) {
    const active = currentSort === sort;

    return (
        <th className="px-4 py-3 text-left font-medium">
            <button
                type="button"
                onClick={() => onSort(sort)}
                className="inline-flex items-center gap-1 text-left hover:text-[#1f3f76]"
            >
                <span>{label}</span>
                <span className="text-xs">{active ? sortMark(direction) : ''}</span>
            </button>
        </th>
    );
}

function PaginationLink({ link }) {
    const label = paginationLabel(link.label);
    const className =
        'rounded-md border px-3 py-1.5 text-sm ' +
        (link.active
            ? 'border-[#355da8] bg-[#355da8] text-white'
            : 'border-[#dbe5f6] bg-white text-[#355da8] hover:bg-[#f4f7fc]') +
        (!link.url ? ' pointer-events-none opacity-50' : '');

    if (!link.url) {
        return <span className={className}>{label}</span>;
    }

    return (
        <Link href={link.url} className={className} preserveScroll>
            {label}
        </Link>
    );
}

function cleanQuery(values) {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== '' && value != null),
    );
}

function sortMark(direction) {
    return direction === 'asc' ? '^' : 'v';
}

function paginationLabel(label) {
    return String(label)
        .replace('&laquo; Previous', '<')
        .replace('Next &raquo;', '>');
}
