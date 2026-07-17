import InputError from '@/Components/InputError';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { toDateTimeInputValue } from '@/lib/dates';
import { translateType, useI18n } from '@/lib/i18n';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Sortable from 'sortablejs';
import { useEffect, useMemo, useRef, useState } from 'react';

const roles = [
    ['student'],
    ['psychologist'],
    ['ddm_staff'],
    ['admin'],
];

const questionTypes = [
    ['single_choice'],
    ['multiple_choice'],
    ['scale'],
    ['text'],
];

const scoringMethods = [
    ['simple_sum'],
    ['scale_based'],
    ['max_match_type'],
    ['trait_matrix_type'],
    ['custom_ranges'],
    ['no_score'],
];

export default function Form({ testItem, mode }) {
    const { errors, flash } = usePage().props;
    const { locale, t } = useI18n();
    const [data, setData] = useState(() => initialData(testItem));
    const [saving, setSaving] = useState(false);
    const questionsListRef = useRef(null);
    const isEdit = mode === 'edit';

    const pageTitle = isEdit
        ? t('admin.tests.editTitle')
        : t('admin.tests.createTitle');
    const scaleOptions = useMemo(
        () => scaleOptionsFromScales(data.scales, locale),
        [data.scales, locale],
    );
    const showScalesEditor = ['scale_based', 'trait_matrix_type'].includes(
        data.scoring_method,
    );

    const submit = (event) => {
        event.preventDefault();

        const payload = {
            ...data,
            scoring_config: JSON.stringify(
                buildScoringConfig(data.scoring_config, data.scales),
            ),
            questions: reindexQuestions(data.questions),
        };

        setSaving(true);
        router.post(
            isEdit
                ? route('admin.tests.update', testItem.id)
                : route('admin.tests.store'),
            isEdit ? { ...payload, _method: 'put' } : payload,
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setSaving(false),
            },
        );
    };

    useEffect(() => {
        if (!questionsListRef.current) {
            return undefined;
        }

        const sortable = Sortable.create(questionsListRef.current, {
            animation: 160,
            draggable: '[data-question-key]',
            handle: '.js-question-drag-handle',
            ghostClass: 'opacity-60',
            onEnd: ({ oldIndex, newIndex }) => {
                if (
                    oldIndex === undefined ||
                    newIndex === undefined ||
                    oldIndex === newIndex
                ) {
                    return;
                }

                setData((current) => ({
                    ...current,
                    questions: moveQuestion(
                        current.questions,
                        oldIndex,
                        newIndex,
                    ),
                }));
            },
        });

        return () => sortable.destroy();
    }, []);

    const setField = (field, value) => setData((current) => ({ ...current, [field]: value }));

    const updateQuestion = (index, field, value) => {
        setField(
            'questions',
            data.questions.map((question, itemIndex) =>
                itemIndex === index ? { ...question, [field]: value } : question,
            ),
        );
    };

    const updateOption = (questionIndex, optionIndex, field, value) => {
        setField(
            'questions',
            data.questions.map((question, itemIndex) => {
                if (itemIndex !== questionIndex) {
                    return question;
                }

                return {
                    ...question,
                    options: question.options.map((option, currentOptionIndex) =>
                        currentOptionIndex === optionIndex
                            ? { ...option, [field]: value }
                            : option,
                    ),
                };
            }),
        );
    };

    const addQuestion = () => {
        setData((current) => ({
            ...current,
            questions: reindexQuestions([
                ...current.questions,
                emptyQuestion(current.questions.length + 1),
            ]),
        }));
    };

    const deleteQuestion = (questionIndex) => {
        setData((current) => ({
            ...current,
            questions: reindexQuestions(
                current.questions.filter((_, index) => index !== questionIndex),
            ),
        }));
    };

    const updateScale = (index, field, value) => {
        const nextValue = field === 'code' ? normalizeScaleCode(value) : value;

        setData((current) => {
            const previousCode = current.scales[index]?.code;
            const nextScales = current.scales.map((scale, itemIndex) =>
                itemIndex === index
                    ? { ...scale, [field]: nextValue }
                    : scale,
            );

            if (field !== 'code' || !previousCode || previousCode === nextValue) {
                return {
                    ...current,
                    scales: nextScales,
                };
            }

            return {
                ...current,
                scales: nextScales,
                questions: replaceScaleInItems(
                    current.questions,
                    previousCode,
                    nextValue,
                ),
                interpretations: replaceScaleInItems(
                    current.interpretations,
                    previousCode,
                    nextValue,
                ),
            };
        });
    };

    const addScale = () => {
        setData((current) => ({
            ...current,
            scales: [
                ...current.scales,
                emptyScale(current.scales.length + 1),
            ],
        }));
    };

    const deleteScale = (scaleIndex) => {
        setData((current) => {
            const deletedScale = current.scales[scaleIndex]?.code;
            const scales = current.scales.filter(
                (_, index) => index !== scaleIndex,
            );

            return {
                ...current,
                scales,
                questions: clearScaleFromItems(current.questions, deletedScale),
                interpretations: clearScaleFromItems(
                    current.interpretations,
                    deletedScale,
                ),
            };
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-[#274f93]">
                        {pageTitle}
                    </h2>
                    <Link
                        href={route('admin.tests.index')}
                        className="text-sm font-medium text-[#355da8] hover:text-[#274f93]"
                    >
                        {t('common.backToList')}
                    </Link>
                </div>
            }
        >
            <Head title={pageTitle} />

            <div className="atu-page">
                <form
                    onSubmit={submit}
                    className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8"
                >
                    {flash.status && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            {flash.status}
                        </div>
                    )}

                    <section className="atu-panel p-6">
                        <h3 className="atu-panel-title">
                            {t('admin.tests.mainData')}
                        </h3>
                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <Field label={t('admin.tests.name')} error={errors.title}>
                                <input
                                    value={data.title}
                                    onChange={(event) =>
                                        setField('title', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                            <Field label={t('admin.tests.type')} error={errors.type}>
                                <select
                                    value={data.type}
                                    onChange={(event) =>
                                        setField('type', event.target.value)
                                    }
                                    className="atu-input w-full"
                                >
                                    <option value="psychology">
                                        {translateType(t, 'psychology', true)}
                                    </option>
                                    <option value="social_survey">
                                        {translateType(t, 'social_survey', true)}
                                    </option>
                                </select>
                            </Field>
                            <Field label={t('admin.tests.category')} error={errors.category}>
                                <input
                                    value={data.category}
                                    onChange={(event) =>
                                        setField('category', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                            <Field label={t('admin.tests.accessRoles')} error={errors.access_roles}>
                                <div className="flex flex-wrap gap-3">
                                    {roles.map(([value, label]) => (
                                        <label
                                            key={value}
                                            className="inline-flex items-center gap-2 text-sm text-gray-700"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={data.access_roles.includes(
                                                    value,
                                                )}
                                                onChange={() =>
                                                    setField(
                                                        'access_roles',
                                                        data.access_roles.includes(
                                                            value,
                                                        )
                                                            ? data.access_roles.filter(
                                                                  (role) =>
                                                                      role !== value,
                                                              )
                                                            : [
                                                                  ...data.access_roles,
                                                                  value,
                                                              ],
                                                    )
                                                }
                                                className="rounded border-gray-300 text-[#355da8] focus:ring-[#355da8]"
                                            />
                                            {t(`role.${value}`)}
                                        </label>
                                    ))}
                                </div>
                            </Field>
                            <Field label={t('admin.tests.start')} error={errors.start_date}>
                                <input
                                    type="datetime-local"
                                    value={data.start_date}
                                    onChange={(event) =>
                                        setField('start_date', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                            <Field label={t('admin.tests.end')} error={errors.end_date}>
                                <input
                                    type="datetime-local"
                                    value={data.end_date}
                                    onChange={(event) =>
                                        setField('end_date', event.target.value)
                                    }
                                    className="atu-input w-full"
                                />
                            </Field>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-4">
                            <Toggle
                                label={t('common.active')}
                                checked={data.is_active}
                                onChange={(value) => setField('is_active', value)}
                            />
                            <Toggle
                                label={t('common.required')}
                                checked={data.is_required}
                                onChange={(value) =>
                                    setField('is_required', value)
                                }
                            />
                        </div>
                        <Field
                            label={t('admin.tests.description')}
                            error={errors.description}
                            className="mt-5"
                        >
                            <textarea
                                value={data.description}
                                onChange={(event) =>
                                    setField('description', event.target.value)
                                }
                                rows={4}
                                className="atu-input w-full"
                            />
                        </Field>
                    </section>

                    <section className="atu-panel p-6">
                        <h3 className="atu-panel-title">
                            {t('admin.tests.scoring')}
                        </h3>
                        <div className="mt-5 grid gap-4 md:grid-cols-[260px_1fr]">
                            <Field
                                label={t('admin.tests.method')}
                                error={errors.scoring_method}
                            >
                                <select
                                    value={data.scoring_method}
                                    onChange={(event) =>
                                        setField(
                                            'scoring_method',
                                            event.target.value,
                                        )
                                    }
                                    className="atu-input w-full"
                                >
                                    {scoringMethods.map(([value]) => (
                                        <option key={value} value={value}>
                                            {t(`scoring.${value}`)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        {showScalesEditor && (
                            <ScalesEditor
                                scales={data.scales}
                                errors={errors}
                                t={t}
                                onAdd={addScale}
                                onDelete={deleteScale}
                                onUpdate={updateScale}
                            />
                        )}
                    </section>

                    <section className="atu-panel p-6">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="atu-panel-title">
                                {t('admin.tests.questions')}
                            </h3>
                            <button
                                type="button"
                                onClick={addQuestion}
                                className="atu-secondary px-3 py-2"
                            >
                                {t('admin.tests.addQuestion')}
                            </button>
                        </div>

                        <div ref={questionsListRef} className="mt-5 space-y-4">
                            {data.questions.map((question, questionIndex) => (
                                <div
                                    key={question.client_id}
                                    data-question-key={question.client_id}
                                    className="rounded-md border border-[#dbe5f6] bg-[#f4f7fc] p-4"
                                >
                                    <div className="grid gap-3 xl:grid-cols-[40px_minmax(420px,1fr)_180px_180px_auto]">
                                        <ControlField label={t('admin.tests.orderColumn')}>
                                            <DragHandle
                                                label={t('admin.tests.dragQuestion')}
                                            />
                                        </ControlField>
                                        <ControlField label={t('admin.tests.questionText')}>
                                            <textarea
                                                value={question.text}
                                                onChange={(event) =>
                                                    updateQuestion(
                                                        questionIndex,
                                                        'text',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder={t('admin.tests.questionText')}
                                                rows={2}
                                                className="atu-input min-h-20 resize-y"
                                            />
                                        </ControlField>
                                        <ControlField label={t('admin.tests.questionTypeColumn')}>
                                            <select
                                                value={question.type}
                                                onChange={(event) =>
                                                    updateQuestion(
                                                        questionIndex,
                                                        'type',
                                                        event.target.value,
                                                    )
                                                }
                                                className="atu-input"
                                            >
                                                {questionTypes.map(([value]) => (
                                                    <option key={value} value={value}>
                                                        {t(`questionType.${value}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </ControlField>
                                        <ControlField label={t('admin.tests.resultScaleColumn')}>
                                            <ScaleField
                                                value={question.scale_name}
                                                onChange={(value) =>
                                                    updateQuestion(
                                                        questionIndex,
                                                        'scale_name',
                                                        value,
                                                    )
                                                }
                                                placeholder={t('admin.tests.scale')}
                                                emptyLabel={t('admin.tests.noScale')}
                                                options={scaleOptions}
                                            />
                                        </ControlField>
                                        <ControlField label={t('admin.tests.actionColumn')}>
                                            <button
                                                type="button"
                                                onClick={() => deleteQuestion(questionIndex)}
                                                className="h-10 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                                            >
                                                {t('common.delete')}
                                            </button>
                                        </ControlField>
                                    </div>

                                    <div className="mt-3">
                                        <Toggle
                                            label={t('common.required')}
                                            checked={question.is_required}
                                            onChange={(value) =>
                                                updateQuestion(
                                                    questionIndex,
                                                    'is_required',
                                                    value,
                                                )
                                            }
                                        />
                                    </div>

                                    {question.type !== 'text' && (
                                        <div className="mt-4 space-y-2">
                                            {question.options.map(
                                                (option, optionIndex) => (
                                                    <div
                                                        key={optionIndex}
                                                        className="grid gap-2 xl:grid-cols-[minmax(420px,1fr)_120px_auto]"
                                                    >
                                                        <ControlField label={t('admin.tests.option')}>
                                                            <input
                                                                value={option.text}
                                                                onChange={(event) =>
                                                                    updateOption(
                                                                        questionIndex,
                                                                        optionIndex,
                                                                        'text',
                                                                        event.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={t('admin.tests.option')}
                                                                className="atu-input"
                                                            />
                                                        </ControlField>
                                                        <ControlField label={t('admin.tests.point')}>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={option.score}
                                                                onChange={(event) =>
                                                                    updateOption(
                                                                        questionIndex,
                                                                        optionIndex,
                                                                        'score',
                                                                        event.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={t('admin.tests.point')}
                                                                className="atu-input"
                                                            />
                                                        </ControlField>
                                                        <ControlField label={t('admin.tests.actionColumn')}>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateQuestion(
                                                                        questionIndex,
                                                                        'options',
                                                                        question.options.filter(
                                                                            (_, index) =>
                                                                                index !==
                                                                                optionIndex,
                                                                        ),
                                                                    )
                                                                }
                                                                className="atu-secondary h-10 px-3 py-2"
                                                            >
                                                                {t('common.remove')}
                                                            </button>
                                                        </ControlField>
                                                    </div>
                                                ),
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateQuestion(
                                                        questionIndex,
                                                        'options',
                                                        [
                                                            ...question.options,
                                                            emptyOption(),
                                                        ],
                                                    )
                                                }
                                                className="atu-secondary px-3 py-2"
                                            >
                                                {t('admin.tests.addOption')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <InterpretationsEditor
                        data={data}
                        setField={setField}
                        errors={errors}
                        t={t}
                        scaleOptions={scaleOptions}
                    />

                    <div className="flex justify-end gap-3">
                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm(t('admin.tests.deleteConfirm'))) {
                                        router.delete(
                                            route(
                                                'admin.tests.destroy',
                                                testItem.id,
                                            ),
                                        );
                                    }
                                }}
                                className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                            >
                                {t('common.delete')}
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={saving}
                            className="atu-primary px-5 py-2 disabled:opacity-50"
                        >
                            {saving ? t('common.saving') : t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}

function ScalesEditor({ scales, errors, t, onAdd, onDelete, onUpdate }) {
    return (
        <div className="mt-5 rounded-md border border-[#dbe5f6] bg-[#f4f7fc] p-4">
            <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-[#274f93]">
                    {t('admin.tests.scales')}
                </h4>
                <button
                    type="button"
                    onClick={onAdd}
                    className="atu-secondary px-3 py-2"
                >
                    {t('admin.tests.addScale')}
                </button>
            </div>
            <InputError message={errors.scoring_config} className="mt-2" />

            <div className="mt-4 space-y-3">
                {scales.map((scale, index) => (
                    <div
                        key={scale.client_id}
                        className="grid gap-3 md:grid-cols-[160px_1fr_1fr_auto]"
                    >
                        <input
                            value={scale.code}
                            onChange={(event) =>
                                onUpdate(
                                    index,
                                    'code',
                                    normalizeScaleCode(event.target.value),
                                )
                            }
                            placeholder={t('admin.tests.scaleCode')}
                            className="atu-input"
                        />
                        <input
                            value={scale.label}
                            onChange={(event) =>
                                onUpdate(index, 'label', event.target.value)
                            }
                            placeholder={t('admin.tests.scaleLabelRu')}
                            className="atu-input"
                        />
                        <input
                            value={scale.label_kk}
                            onChange={(event) =>
                                onUpdate(index, 'label_kk', event.target.value)
                            }
                            placeholder={t('admin.tests.scaleLabelKk')}
                            className="atu-input"
                        />
                        <button
                            type="button"
                            onClick={() => onDelete(index)}
                            className="atu-secondary px-3 py-2"
                        >
                            {t('common.remove')}
                        </button>
                    </div>
                ))}

                {scales.length === 0 && (
                    <div className="rounded-md border border-dashed border-[#c9d7ef] bg-white px-4 py-3 text-sm text-gray-500">
                        {t('admin.tests.noScales')}
                    </div>
                )}
            </div>
        </div>
    );
}

function InterpretationsEditor({ data, setField, errors, t, scaleOptions }) {
    const updateInterpretation = (index, field, value) => {
        setField(
            'interpretations',
            data.interpretations.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [field]: value } : item,
            ),
        );
    };

    return (
        <section className="atu-panel p-6">
            <div className="flex items-center justify-between gap-3">
                <h3 className="atu-panel-title">
                    {t('admin.tests.interpretations')}
                </h3>
                <button
                    type="button"
                    onClick={() =>
                        setField('interpretations', [
                            ...data.interpretations,
                            emptyInterpretation(),
                        ])
                    }
                    className="atu-secondary px-3 py-2"
                >
                    {t('common.add')}
                </button>
            </div>
            <InputError message={errors.interpretations} className="mt-2" />

            <div className="mt-5 space-y-4">
                {data.interpretations.map((item, index) => (
                    <div
                        key={index}
                        className="rounded-md border border-[#dbe5f6] bg-[#f4f7fc] p-4"
                    >
                        <div className="grid gap-3 md:grid-cols-[160px_120px_120px_1fr_auto]">
                            <ScaleField
                                value={item.scale_name}
                                onChange={(value) =>
                                    updateInterpretation(
                                        index,
                                        'scale_name',
                                        value,
                                    )
                                }
                                placeholder={t('admin.tests.scaleOrType')}
                                emptyLabel={t('admin.tests.noScale')}
                                options={scaleOptions}
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={item.min_score}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'min_score',
                                        event.target.value,
                                    )
                                }
                                placeholder={t('admin.tests.min')}
                                className="atu-input"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={item.max_score}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'max_score',
                                        event.target.value,
                                    )
                                }
                                placeholder={t('admin.tests.max')}
                                className="atu-input"
                            />
                            <input
                                value={item.title}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'title',
                                        event.target.value,
                                    )
                                }
                                placeholder={t('admin.tests.titlePlaceholder')}
                                className="atu-input"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setField(
                                        'interpretations',
                                        data.interpretations.filter(
                                            (_, itemIndex) => itemIndex !== index,
                                        ),
                                    )
                                }
                                className="atu-secondary px-3 py-2"
                            >
                                {t('common.remove')}
                            </button>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <textarea
                                value={item.description}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'description',
                                        event.target.value,
                                    )
                                }
                                placeholder={t('admin.tests.description')}
                                rows={3}
                                className="atu-input"
                            />
                            <textarea
                                value={item.recommendation}
                                onChange={(event) =>
                                    updateInterpretation(
                                        index,
                                        'recommendation',
                                        event.target.value,
                                    )
                                }
                                placeholder={t('admin.tests.recommendation')}
                                rows={3}
                                className="atu-input"
                            />
                        </div>
                        <div className="mt-3">
                            <Toggle
                                label={t('common.highRisk')}
                                checked={item.is_high_risk}
                                onChange={(value) =>
                                    updateInterpretation(
                                        index,
                                        'is_high_risk',
                                        value,
                                    )
                                }
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function Field({ label, error, children, className = '' }) {
    return (
        <label className={`block ${className}`}>
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <div className="mt-1">{children}</div>
            <InputError message={error} className="mt-2" />
        </label>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                className="rounded border-gray-300 text-[#355da8] focus:ring-[#355da8]"
            />
            {label}
        </label>
    );
}

function ControlField({ label, children }) {
    return (
        <div className="min-w-0 [&_.atu-input]:w-full">
            <div className="mb-1 text-xs font-semibold text-gray-500">
                {label}
            </div>
            {children}
        </div>
    );
}

function DragHandle({ label }) {
    return (
        <button
            type="button"
            className="js-question-drag-handle flex h-10 w-10 cursor-grab items-center justify-center rounded-md border border-[#dbe5f6] bg-white active:cursor-grabbing"
            aria-label={label}
            title={label}
        >
            <span className="grid grid-cols-2 gap-1" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, index) => (
                    <span
                        key={index}
                        className="h-1 w-1 rounded-full bg-[#355da8]"
                    />
                ))}
            </span>
        </button>
    );
}

function ScaleField({ value, onChange, options, placeholder, emptyLabel }) {
    if (!options.length) {
        return (
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="atu-input"
            />
        );
    }

    return (
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="atu-input"
        >
            <option value="">{emptyLabel}</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}

function initialData(testItem) {
    const rule = testItem?.scoring_rule;
    const scoringConfig = rule?.config || {};

    return {
        title: testItem?.title || '',
        description: testItem?.description || '',
        type: testItem?.type || 'psychology',
        category: testItem?.category || '',
        is_required: Boolean(testItem?.is_required),
        is_active: testItem ? Boolean(testItem.is_active) : true,
        access_roles: testItem?.access_roles || ['student'],
        start_date: toDateTimeInputValue(testItem?.start_date),
        end_date: toDateTimeInputValue(testItem?.end_date),
        scoring_method: rule?.method || 'simple_sum',
        scoring_config: JSON.stringify(scoringConfig),
        scales: scalesFromConfig(scoringConfig),
        questions: (testItem?.questions || []).map((question, index) => ({
            client_id: questionClientId(question),
            id: question.id,
            text: question.text || '',
            type: question.type || 'single_choice',
            order: question.order ?? index + 1,
            is_required: Boolean(question.is_required),
            scale_name: question.scale_name || '',
            options: (question.options || []).map((option) => ({
                id: option.id,
                text: option.text || '',
                score: option.score ?? 0,
                value: option.value || '',
            })),
        })),
        interpretations: (testItem?.interpretations || []).map((item) => ({
            id: item.id,
            scale_name: item.scale_name || '',
            min_score: item.min_score ?? '',
            max_score: item.max_score ?? '',
            title: item.title || '',
            description: item.description || '',
            recommendation: item.recommendation || '',
            is_high_risk: Boolean(item.is_high_risk),
        })),
    };
}

function emptyQuestion(order) {
    return {
        client_id: questionClientId(),
        text: '',
        type: 'single_choice',
        order,
        is_required: true,
        scale_name: '',
        options: [emptyOption()],
    };
}

function emptyScale(order) {
    return {
        client_id: scaleClientId(),
        code: '',
        label: '',
        label_kk: '',
        order,
    };
}

function emptyOption() {
    return {
        text: '',
        score: 0,
        value: '',
    };
}

function emptyInterpretation() {
    return {
        scale_name: '',
        min_score: '',
        max_score: '',
        title: '',
        description: '',
        recommendation: '',
        is_high_risk: false,
    };
}

function moveQuestion(questions, oldIndex, newIndex) {
    const nextQuestions = [...questions];
    const [question] = nextQuestions.splice(oldIndex, 1);

    if (!question) {
        return questions;
    }

    nextQuestions.splice(newIndex, 0, question);

    return reindexQuestions(nextQuestions);
}

function reindexQuestions(questions) {
    return questions.map((question, index) => ({
        ...question,
        order: index + 1,
    }));
}

let nextQuestionClientId = 0;

function questionClientId(question = null) {
    return question?.id
        ? `question-${question.id}`
        : `new-question-${++nextQuestionClientId}`;
}

let nextScaleClientId = 0;

function scaleClientId(code = null) {
    return code ? `scale-${code}` : `new-scale-${++nextScaleClientId}`;
}

function scalesFromConfig(config) {
    const scales = [];

    if (Array.isArray(config.scales)) {
        config.scales.forEach((meta, index) => {
            const code =
                typeof meta === 'string'
                    ? meta
                    : meta?.value || meta?.code || meta?.key || '';

            if (code) {
                scales.push(scaleFromMeta(code, meta, index + 1));
            }
        });
    } else if (config.scales && typeof config.scales === 'object') {
        Object.entries(config.scales).forEach(([code, meta], index) => {
            scales.push(scaleFromMeta(code, meta, index + 1));
        });
    }

    if (config.scale_labels && typeof config.scale_labels === 'object') {
        Object.entries(config.scale_labels).forEach(([code, label], index) => {
            if (!scales.some((scale) => scale.code === code)) {
                scales.push(scaleFromMeta(code, label, index + 1));
            }
        });
    }

    return scales.sort((left, right) => left.order - right.order);
}

function scaleFromMeta(code, meta, fallbackOrder) {
    const normalizedCode = normalizeScaleCode(code);
    const label = scaleLabelFromMeta(normalizedCode, meta, 'ru');
    const labelKk =
        typeof meta === 'object' && meta
            ? meta.translations?.kk?.label || ''
            : '';

    return {
        client_id: scaleClientId(normalizedCode || null),
        code: normalizedCode,
        label,
        label_kk: labelKk,
        order: scaleOrderFromMeta(meta, fallbackOrder),
    };
}

function scaleOptionsFromScales(scales, locale) {
    return scales
        .filter((scale) => scale.code)
        .map((scale, index) => ({
            value: scale.code,
            label:
                locale === 'kk'
                    ? scale.label_kk || scale.label || scale.code
                    : scale.label || scale.code,
            order: scale.order || index + 1,
        }))
        .sort(
            (left, right) =>
                left.order - right.order || left.label.localeCompare(right.label),
        );
}

function buildScoringConfig(configText, scales) {
    let config = {};

    try {
        config = JSON.parse(configText || '{}') || {};
    } catch {
        config = {};
    }

    const scaleConfig = {};

    scales
        .map((scale, index) => ({
            ...scale,
            code: normalizeScaleCode(scale.code),
            order: index + 1,
        }))
        .filter((scale) => scale.code)
        .forEach((scale) => {
            scaleConfig[scale.code] = {
                label: scale.label || scale.code,
                order: scale.order,
            };

            if (scale.label_kk) {
                scaleConfig[scale.code].translations = {
                    kk: {
                        label: scale.label_kk,
                    },
                };
            }
        });

    delete config.scale_labels;

    if (Object.keys(scaleConfig).length > 0) {
        config.scales = scaleConfig;
    } else {
        delete config.scales;
    }

    return config;
}

function scaleLabelFromMeta(value, meta, locale) {
    if (typeof meta === 'string') {
        return meta;
    }

    if (!meta || typeof meta !== 'object') {
        return value;
    }

    return meta.translations?.[locale]?.label || meta.label || meta.name || value;
}

function scaleOrderFromMeta(meta, fallback) {
    return Number.isFinite(Number(meta?.order)) ? Number(meta.order) : fallback;
}

function normalizeScaleCode(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
}

function clearScaleFromItems(items, deletedScale) {
    if (!deletedScale) {
        return items;
    }

    return items.map((item) =>
        item.scale_name === deletedScale ? { ...item, scale_name: '' } : item,
    );
}

function replaceScaleInItems(items, previousScale, nextScale) {
    return items.map((item) =>
        item.scale_name === previousScale
            ? { ...item, scale_name: nextScale }
            : item,
    );
}
