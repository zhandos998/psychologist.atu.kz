import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useI18n } from '@/lib/i18n';
import { Head, Link } from '@inertiajs/react';

export default function Result({ attempt }) {
    const { t } = useI18n();
    const result = attempt.result_json || {};

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                    {t('result.title')}
                </h2>
            }
        >
            <Head title={t('result.title')} />

            <div className="atu-page">
                <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="atu-panel p-6">
                        <div className="text-sm text-gray-500">
                            {attempt.test.title}
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-4">
                            <div>
                                <div className="text-sm text-gray-500">
                                    {t('common.score')}
                                </div>
                                <div className="text-4xl font-semibold text-[#274f93]">
                                    {attempt.total_score ?? t('common.dash')}
                                </div>
                            </div>
                            <span
                                className={
                                    'rounded-full px-3 py-1 text-sm font-medium ' +
                                    (attempt.is_high_risk
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-emerald-100 text-emerald-700')
                                }
                            >
                                {attempt.is_high_risk
                                    ? t('result.highRisk')
                                    : t('result.noHighRisk')}
                            </span>
                        </div>
                        {result.matched_type && (
                            <div className="mt-4 rounded-lg border border-[#dbe5f6] bg-[#f4f7fc] p-4 text-sm">
                                <span className="text-gray-500">
                                    {t('result.finalType')}:{' '}
                                </span>
                                <span className="font-semibold text-[#274f93]">
                                    {result.matched_label || result.matched_type}
                                </span>
                                {result.interpretation && (
                                    <TextInterpretation
                                        interpretation={result.interpretation}
                                    />
                                )}
                            </div>
                        )}

                        {attempt.is_high_risk && (
                            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                                {t('result.sppRecommendation')}
                            </div>
                        )}
                    </section>

                    <Interpretation result={result} t={t} />

                    {attempt.answers.length > 0 && (
                        <section className="atu-panel p-6">
                            <h3 className="font-semibold text-[#274f93]">
                                {t('result.answers')}
                            </h3>
                            <div className="mt-4 divide-y divide-gray-100">
                                {attempt.answers.map((answer) => (
                                    <div key={answer.id} className="py-3">
                                        <div className="text-sm font-medium text-[#274f93]">
                                            {answer.question.text}
                                        </div>
                                        <div className="mt-1 text-sm text-gray-600">
                                            {answer.option?.text ||
                                                answer.text_answer ||
                                                t('common.dash')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <Link
                        href={route('tests.index')}
                        className="atu-secondary"
                    >
                        {t('result.toTests')}
                    </Link>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function Interpretation({ result, t }) {
    if (result.scales) {
        return (
            <section className="atu-panel p-6">
                <h3 className="font-semibold text-[#274f93]">
                    {t('result.scales')}
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {Object.entries(result.scales).map(([scale, data]) => (
                        <div
                            key={scale}
                            className="rounded-md border border-[#dbe5f6] bg-[#f4f7fc] p-4"
                        >
                            <div className="text-sm text-gray-500">
                                {data.label ||
                                    data.interpretation?.scale_label ||
                                    data.interpretation?.scale_name ||
                                    scale}
                            </div>
                            <div className="mt-1 text-2xl font-semibold text-[#274f93]">
                                {data.score}
                            </div>
                            {data.interpretation && (
                                <TextInterpretation
                                    interpretation={data.interpretation}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (result.interpretation) {
        return (
            <section className="atu-panel p-6">
                <TextInterpretation interpretation={result.interpretation} />
            </section>
        );
    }

    if (result.matched_type) {
        return (
            <section className="atu-panel p-6">
                <h3 className="font-semibold text-[#274f93]">
                    {result.matched_type}
                </h3>
            </section>
        );
    }

    return null;
}

function TextInterpretation({ interpretation }) {
    return (
        <div className="mt-3 space-y-2 text-sm">
            <h3 className="font-semibold text-[#274f93]">
                {interpretation.title}
            </h3>
            {interpretation.description && (
                <p className="text-gray-600">{interpretation.description}</p>
            )}
            {interpretation.recommendation && (
                <p className="whitespace-pre-line font-medium text-gray-800">
                    {interpretation.recommendation}
                </p>
            )}
        </div>
    );
}
