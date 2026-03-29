'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ApiError, api, Player, UserVotes } from '@/services/api';
import { useI18n } from '@/i18n/useI18n';
import { I18nKey } from '@/i18n/messages';

type VotingFormProps = {
  roomId: string;
  eligiblePlayers: Player[];
  initialVotes: UserVotes | null;
};

function mapApiErrorToKey(error: ApiError): I18nKey {
  switch (error.code) {
    case 'MISSING_VOTES':
      return 'voteErrorMissing';
    case 'SAME_TARGET_FOR_BOTH_VOTES':
      return 'voteErrorSame';
    case 'SELF_VOTE_NOT_ALLOWED':
      return 'voteErrorSelf';
    case 'VOTING_CLOSED':
      return 'voteErrorClosed';
    case 'TARGET_NOT_ACTIVE':
      return 'voteErrorTargetInactive';
    default:
      return 'voteErrorGeneric';
  }
}

export function VotingForm({ roomId, eligiblePlayers, initialVotes }: VotingFormProps) {
  const { t } = useI18n();
  const { userId, getToken } = useAuth();

  const [primaryVote, setPrimaryVote] = useState('');
  const [primaryReason, setPrimaryReason] = useState('');
  const [secondaryVote, setSecondaryVote] = useState('');
  const [secondaryReason, setSecondaryReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (initialVotes?.primaryVote) {
      setPrimaryVote(initialVotes.primaryVote.targetUserId);
      setPrimaryReason(initialVotes.primaryVote.reason || '');
    }
    if (initialVotes?.secondaryVote) {
      setSecondaryVote(initialVotes.secondaryVote.targetUserId);
      setSecondaryReason(initialVotes.secondaryVote.reason || '');
    }
  }, [initialVotes]);

  const playerOptions = useMemo(
    () => eligiblePlayers.map((player) => ({ value: player.id, label: player.username })),
    [eligiblePlayers]
  );

  const submitVotes = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!primaryVote || !secondaryVote) {
      setError(t('voteErrorMissing'));
      return;
    }

    if (primaryVote === secondaryVote) {
      setError(t('voteErrorSame'));
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const token = await getToken();
      await api.submitVotes(
        roomId,
        { userId: primaryVote, reason: primaryReason },
        { userId: secondaryVote, reason: secondaryReason },
        token ? { token } : { devUserId: userId || undefined }
      );
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(t(mapApiErrorToKey(error)));
      } else {
        setError(t('voteErrorGeneric'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-lg border border-green-400 bg-green-50 p-4">
        <h3 className="text-lg font-semibold text-green-800">{t('voteSuccessTitle')}</h3>
        <p className="text-green-700">{t('voteSuccessBody')}</p>
        <button
          type="button"
          className="mt-3 rounded bg-green-700 px-3 py-2 text-sm font-medium text-white"
          onClick={() => setIsSuccess(false)}
        >
          {t('voteEditAgain')}
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={submitVotes}>
      <div className="space-y-2">
        <h3 className="text-lg font-medium">{t('votePrimaryTitle')}</h3>
        <select
          value={primaryVote}
          onChange={(event) => setPrimaryVote(event.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="">{t('voteSelectLabel')}</option>
          {playerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <textarea
          value={primaryReason}
          onChange={(event) => setPrimaryReason(event.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder={t('voteReasonLabel')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-medium">{t('voteSecondaryTitle')}</h3>
        <select
          value={secondaryVote}
          onChange={(event) => setSecondaryVote(event.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          <option value="">{t('voteSelectLabel')}</option>
          {playerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <textarea
          value={secondaryReason}
          onChange={(event) => setSecondaryReason(event.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
          placeholder={t('voteReasonLabel')}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {isSubmitting ? t('voteSubmitting') : t('voteSubmit')}
      </button>
    </form>
  );
}
