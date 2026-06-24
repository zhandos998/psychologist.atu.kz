import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

const typeLabels = {
    psychology: 'Психологический тест',
    social_survey: 'Социальная анкета',
    mood_meter: 'Тестомер настроения',
};

export default function Index({ tests }) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                    Тесты и анкеты
                </h2>
            }
        >
            <Head title="Тесты" />

            <div className="atu-page">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {tests.map((test) => (
                            <article
                                key={test.id}
                                className="atu-panel p-5"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-medium uppercase tracking-wide text-[#355da8]">
                                            {typeLabels[test.type] || test.type}
                                        </div>
                                        <h3 className="mt-2 text-lg font-semibold text-[#274f93]">
                                            {test.title}
                                        </h3>
                                    </div>
                                    {test.is_required && (
                                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                            Обязательный
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 line-clamp-3 text-sm text-gray-600">
                                    {test.description || 'Без описания'}
                                </p>
                                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                                    <span>{test.category || 'Без категории'}</span>
                                    <span>·</span>
                                    <span>{test.questions_count} вопросов</span>
                                    {test.completed_at && (
                                        <>
                                            <span>·</span>
                                            <span>Пройден</span>
                                        </>
                                    )}
                                </div>
                                <Link
                                    href={route('tests.show', test.id)}
                                    className="atu-primary mt-5 w-full"
                                >
                                    {test.completed_at ? 'Пройти снова' : 'Открыть'}
                                </Link>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
