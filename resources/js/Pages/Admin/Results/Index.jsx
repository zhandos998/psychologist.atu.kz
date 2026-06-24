import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ attempts, tests, filters }) {
    const [form, setForm] = useState({
        faculty: filters.faculty || '',
        group_name: filters.group_name || '',
        student: filters.student || '',
        test_id: filters.test_id || '',
        risk: filters.risk ?? '',
    });

    const setField = (field, value) =>
        setForm((current) => ({ ...current, [field]: value }));

    const applyFilters = (event) => {
        event.preventDefault();
        router.get(route('admin.results.index'), form, {
            preserveState: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                    Результаты
                </h2>
            }
        >
            <Head title="Результаты" />

            <div className="atu-page">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    <form
                        onSubmit={applyFilters}
                        className="atu-panel grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6"
                    >
                        <input
                            value={form.faculty}
                            onChange={(event) =>
                                setField('faculty', event.target.value)
                            }
                            placeholder="Факультет"
                            className="atu-input"
                        />
                        <input
                            value={form.group_name}
                            onChange={(event) =>
                                setField('group_name', event.target.value)
                            }
                            placeholder="Группа"
                            className="atu-input"
                        />
                        <input
                            value={form.student}
                            onChange={(event) =>
                                setField('student', event.target.value)
                            }
                            placeholder="Студент"
                            className="atu-input"
                        />
                        <select
                            value={form.test_id}
                            onChange={(event) =>
                                setField('test_id', event.target.value)
                            }
                            className="atu-input"
                        >
                            <option value="">Все тесты</option>
                            {tests.map((test) => (
                                <option key={test.id} value={test.id}>
                                    {test.title}
                                </option>
                            ))}
                        </select>
                        <select
                            value={form.risk}
                            onChange={(event) => setField('risk', event.target.value)}
                            className="atu-input"
                        >
                            <option value="">Любой риск</option>
                            <option value="1">Высокий</option>
                            <option value="0">Без высокого</option>
                        </select>
                        <button className="atu-secondary">
                            Применить
                        </button>
                    </form>

                    <div className="flex flex-wrap justify-end gap-2">
                        <Link
                            href={route('admin.results.export.csv', form)}
                            className="atu-secondary"
                        >
                            CSV
                        </Link>
                        <Link
                            href={route('admin.results.export.xls', form)}
                            className="atu-secondary"
                        >
                            Excel
                        </Link>
                    </div>

                    <section className="atu-panel">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="atu-table-head">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Студент
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Группа
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Тест
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Балл
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Риск
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Дата
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {attempts.map((attempt) => (
                                        <tr key={attempt.id}>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-[#274f93]">
                                                    {attempt.user.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {attempt.user.email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {attempt.user.faculty || '—'} ·{' '}
                                                {attempt.user.group_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {attempt.test.title}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {attempt.total_score ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        'rounded-full px-2 py-1 text-xs font-medium ' +
                                                        (attempt.is_high_risk
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-emerald-100 text-emerald-700')
                                                    }
                                                >
                                                    {attempt.is_high_risk
                                                        ? 'Высокий'
                                                        : 'Нет'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
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
