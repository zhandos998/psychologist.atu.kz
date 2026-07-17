import InputError from '@/Components/InputError';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateTime } from '@/lib/dates';
import { translateType, useI18n } from '@/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Show({ testItem, previousAttempts }) {
    const { locale, t } = useI18n();
    const groups = questionGroups(testItem.questions);
    const { data, setData, post, processing, errors } = useForm({
        answers: {},
    });

    const submit = (event) => {
        event.preventDefault();
        post(route('tests.attempts.store', testItem.id), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                        {testItem.title}
                    </h2>
                    <Link
                        href={route('tests.index')}
                        className="text-sm font-medium text-[#355da8] hover:text-[#274f93]"
                    >
                        {t('tests.back')}
                    </Link>
                </div>
            }
        >
            <Head title={testItem.title} />

            <div className="atu-page">
                <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <section className="atu-panel p-6">
                        <div className="flex flex-wrap gap-2 text-xs font-medium text-[#355da8]">
                            <span>{translateType(t, testItem.type)}</span>
                            {testItem.category && (
                                <span>· {testItem.category}</span>
                            )}
                            {testItem.is_required && (
                                <span>· {t('common.required')}</span>
                            )}
                        </div>
                        {testItem.description && (
                            <p className="mt-3 text-sm leading-6 text-gray-700">
                                {testItem.description}
                            </p>
                        )}
                    </section>

                    {previousAttempts.length > 0 && (
                        <section className="atu-panel p-6">
                            <h3 className="font-semibold text-[#274f93]">
                                {t('tests.previousAttempts')}
                            </h3>
                            <div className="mt-3 divide-y divide-gray-100 text-sm">
                                {previousAttempts.map((attempt) => (
                                    <div
                                        key={attempt.id}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <span className="text-gray-600">
                                            {attempt.finished_at_label ||
                                                formatDateTime(
                                                    attempt.finished_at,
                                                    locale,
                                                )}
                                        </span>
                                        <Link
                                            href={route(
                                                'attempts.show',
                                                attempt.id,
                                            )}
                                            className="font-medium text-[#355da8] hover:text-[#274f93]"
                                        >
                                            {t('tests.result')}
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <form onSubmit={submit} className="space-y-4">
                        {groups.map((group) => (
                            <div key={group.name || 'general'} className="space-y-4">
                                {group.name && groups.length > 1 && (
                                    <div className="rounded-md border border-[#dbe5f6] bg-[#edf3ff] px-4 py-3">
                                        <h3 className="font-semibold text-[#274f93]">
                                            {group.name}
                                        </h3>
                                    </div>
                                )}

                                {group.questions.map((question) => (
                                    <QuestionBlock
                                        key={question.id}
                                        question={question}
                                        value={data.answers[question.id]}
                                        setValue={(value) =>
                                            setData('answers', {
                                                ...data.answers,
                                                [question.id]: value,
                                            })
                                        }
                                        error={errors[`answers.${question.id}`]}
                                    />
                                ))}
                            </div>
                        ))}

                        {testItem.questions.length === 0 && (
                            <section className="atu-panel p-6">
                                <p className="text-sm text-gray-600">
                                    {t('tests.emptyVideo')}
                                </p>
                            </section>
                        )}

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={processing}
                                className="atu-primary px-5 py-2.5 disabled:opacity-50"
                            >
                                {processing
                                    ? t('tests.saving')
                                    : t('tests.finish')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function questionGroups(questions) {
    return questions.reduce((groups, question) => {
        const name = question.scale_label || question.scale_name || null;
        const lastGroup = groups[groups.length - 1];

        if (!lastGroup || lastGroup.name !== name) {
            groups.push({ name, questions: [] });
        }

        groups[groups.length - 1].questions.push(question);

        return groups;
    }, []);
}

function QuestionBlock({ question, value, setValue, error }) {
    return (
        <section className="atu-panel p-6">
            <div className="min-w-0">
                <div className="font-medium text-[#274f93]">
                    {question.text}
                    {question.is_required && (
                        <span className="text-red-600"> *</span>
                    )}
                </div>
                <div className="mt-4">
                    <QuestionInput
                        question={question}
                        value={value}
                        setValue={setValue}
                    />
                </div>
                <InputError message={error} className="mt-2" />
            </div>
        </section>
    );
}

function QuestionInput({ question, value, setValue }) {
    if (question.type === 'text') {
        return (
            <textarea
                value={value || ''}
                onChange={(event) => setValue(event.target.value)}
                rows={4}
                className="atu-input w-full"
            />
        );
    }

    if (question.type === 'multiple_choice') {
        const selected = value || [];

        return (
            <div className="space-y-2">
                {question.options.map((option) => (
                    <label
                        key={option.id}
                        className="flex items-center gap-3 rounded-md border border-[#dbe5f6] bg-white px-3 py-2 text-sm text-gray-700"
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(option.id)}
                            onChange={() =>
                                setValue(
                                    selected.includes(option.id)
                                        ? selected.filter(
                                              (id) => id !== option.id,
                                          )
                                        : [...selected, option.id],
                                )
                            }
                            className="rounded border-gray-300 text-[#355da8] focus:ring-[#355da8]"
                        />
                        <span>{option.text}</span>
                    </label>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {question.options.map((option) => (
                <label
                    key={option.id}
                    className={
                        'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ' +
                        (Number(value) === option.id
                            ? 'border-[#355da8] bg-[#edf3ff] text-[#274f93]'
                            : 'border-[#dbe5f6] bg-white text-gray-700')
                    }
                >
                    <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={Number(value) === option.id}
                        onChange={() => setValue(option.id)}
                        className="border-gray-300 text-[#355da8] focus:ring-[#355da8]"
                    />
                    <span>{option.text}</span>
                </label>
            ))}
        </div>
    );
}

function splitScaleOption(text) {
    const match = String(text || '').match(/^\s*(\d+)\s*[-–—]\s*(.+)$/);

    if (!match) {
        return { number: null, label: text };
    }

    return {
        number: match[1],
        label: match[2],
    };
}
