import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const typeLabels = {
    psychology: 'Психология',
    social_survey: 'Социальная анкета',
    mood_meter: 'Настроение',
};

export default function Index({ tests, filters }) {
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
                        Конструктор тестов
                    </h2>
                    <Link
                        href={route('admin.tests.create')}
                        className="atu-primary"
                    >
                        Создать тест
                    </Link>
                </div>
            }
        >
            <Head title="Конструктор тестов" />

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
                            placeholder="Поиск"
                            className="atu-input"
                        />
                        <select
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            className="atu-input"
                        >
                            <option value="">Все типы</option>
                            {Object.entries(typeLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <button className="atu-secondary">
                            Фильтр
                        </button>
                    </form>

                    <section className="atu-panel">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="atu-table-head">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Название
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Тип
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Вопросы
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Попытки
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Статус
                                        </th>
                                        <th className="px-4 py-3" />
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
                                                    {test.category || 'Без категории'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {typeLabels[test.type] || test.type}
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
                                                        ? 'Активен'
                                                        : 'Выключен'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={route(
                                                        'admin.tests.edit',
                                                        test.id,
                                                    )}
                                                    className="font-medium text-[#355da8] hover:text-[#274f93]"
                                                >
                                                    Изменить
                                                </Link>
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
