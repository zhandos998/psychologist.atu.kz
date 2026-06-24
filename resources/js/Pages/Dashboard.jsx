import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard({
    stats,
    requiredTests,
    recentAttempts,
    canManageTests,
    canViewResults,
}) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                    Панель
                </h2>
            }
        >
            <Head title="Панель" />

            <div className="atu-page">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="overflow-hidden rounded-lg bg-[#355da8] p-6 text-white shadow-sm">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="text-sm font-medium text-blue-100">
                                    СПП ATU
                                </div>
                                <h3 className="mt-2 text-2xl font-semibold">
                                    Кабинет психологического сопровождения
                                </h3>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
                                    Тесты, социальные анкеты, мониторинг
                                    настроения и журнал результатов в едином
                                    рабочем интерфейсе.
                                </p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <HeroStat
                                    label="Назначено"
                                    value={stats.required_pending}
                                />
                                <HeroStat
                                    label="Высокий риск"
                                    value={stats.high_risk_attempts}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-4 md:grid-cols-4">
                        <Metric label="Доступно" value={stats.available_tests} />
                        <Metric
                            label="Обязательные"
                            value={stats.required_pending}
                        />
                        <Metric
                            label="Пройдено"
                            value={stats.completed_attempts}
                        />
                        <Metric
                            label="Высокий риск"
                            value={stats.high_risk_attempts}
                        />
                    </div>

                    <section className="atu-panel">
                        <div className="atu-panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="atu-panel-title">
                                    Обязательные тесты
                                </h3>
                                <p className="text-sm text-gray-500">
                                    Невыполненные назначения для текущей роли.
                                </p>
                            </div>
                            <Link
                                href={route('tests.index')}
                                className="atu-primary"
                            >
                                Все тесты
                            </Link>
                        </div>

                        <div className="divide-y divide-gray-100 px-6 py-2">
                            {requiredTests.length === 0 && (
                                <div className="py-5 text-sm text-gray-500">
                                    Нет обязательных тестов.
                                </div>
                            )}
                            {requiredTests.map((test) => (
                                <div
                                    key={test.id}
                                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <div className="font-medium text-[#274f93]">
                                            {test.title}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {test.category || test.type} ·{' '}
                                            {test.questions_count} вопросов
                                        </div>
                                    </div>
                                    <Link
                                        href={route('tests.show', test.id)}
                                        className="atu-secondary"
                                    >
                                        Пройти
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="atu-panel">
                        <div className="atu-panel-header flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="atu-panel-title">
                                Последние результаты
                            </h3>
                            <div className="flex gap-2">
                                {canManageTests && (
                                    <Link
                                        href={route('admin.tests.index')}
                                        className="atu-secondary px-3 py-2"
                                    >
                                        Конструктор
                                    </Link>
                                )}
                                {canViewResults && (
                                    <Link
                                        href={route('admin.results.index')}
                                        className="atu-secondary px-3 py-2"
                                    >
                                        Журнал
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto px-6 py-4">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead>
                                    <tr className="text-left text-[#274f93]">
                                        <th className="py-2 pr-4 font-medium">
                                            Тест
                                        </th>
                                        <th className="py-2 pr-4 font-medium">
                                            Балл
                                        </th>
                                        <th className="py-2 pr-4 font-medium">
                                            Риск
                                        </th>
                                        <th className="py-2 pr-4 font-medium">
                                            Дата
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentAttempts.map((attempt) => (
                                        <tr key={attempt.id}>
                                            <td className="py-3 pr-4 text-[#274f93]">
                                                {attempt.test.title}
                                            </td>
                                            <td className="py-3 pr-4 text-gray-700">
                                                {attempt.total_score ?? '—'}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <RiskBadge
                                                    risk={attempt.is_high_risk}
                                                />
                                            </td>
                                            <td className="py-3 pr-4 text-gray-500">
                                                {attempt.finished_at}
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

function Metric({ label, value }) {
    return (
        <div className="atu-panel p-5">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="mt-2 text-3xl font-semibold text-[#274f93]">
                {value}
            </div>
        </div>
    );
}

function HeroStat({ label, value }) {
    return (
        <div className="rounded-md bg-white/10 px-4 py-3 ring-1 ring-white/20">
            <div className="text-xs font-medium uppercase tracking-wide text-blue-100">
                {label}
            </div>
            <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
    );
}

function RiskBadge({ risk }) {
    return (
        <span
            className={
                'inline-flex rounded-full px-2 py-1 text-xs font-medium ' +
                (risk
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700')
            }
        >
            {risk ? 'Высокий' : 'Нет'}
        </span>
    );
}
