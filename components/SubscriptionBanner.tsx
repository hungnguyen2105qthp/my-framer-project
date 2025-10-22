import React, { useEffect, useState } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-context';
import { differenceInDays, addDays, formatDistanceToNowStrict } from 'date-fns';

const STRIPE_URL = 'https://buy.stripe.com/aEU15V7uYczb2nC9AE?success_url=https://wispai.app/conversion-tracking';
const TRIAL_DAYS = 7;

export default function SubscriptionBanner() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const db = getFirebaseDb();
    const email = user.email.toLowerCase();

    async function checkSubscription() {
      // 1. Check inappsubscribed
      const subDoc = await getDoc(doc(db, 'inappsubscribed', email));
      if (subDoc.exists() && subDoc.data()?.isSubscribed) {
        setShow(false);
        setLoading(false);
        return;
      }
      // 2. Check startsub for firstSigninAt
      const startDoc = await getDoc(doc(db, 'startsub', email));
      let firstSigninAt: Date | null = null;
      if (startDoc.exists()) {
        const data = startDoc.data();
        if (data.firstSigninAt?.toDate) {
          firstSigninAt = data.firstSigninAt.toDate();
        } else if (data.firstSigninAt?._seconds) {
          firstSigninAt = new Date(data.firstSigninAt._seconds * 1000);
        } else if (typeof data.firstSigninAt === 'string' || typeof data.firstSigninAt === 'number') {
          firstSigninAt = new Date(data.firstSigninAt);
        }
      }
      if (!firstSigninAt) {
        // If no firstSigninAt, treat as expired
        window.location.href = STRIPE_URL;
        return;
      }
      const trialEnd = addDays(firstSigninAt, TRIAL_DAYS);
      const now = new Date();
      if (now >= trialEnd) {
        window.location.href = STRIPE_URL;
        return;
      }
      setDaysLeft(differenceInDays(trialEnd, now));
      setShow(true);
      setLoading(false);
    }
    checkSubscription();
  }, [user]);

  if (loading || !show) return null;

  return (
    <div className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-gray-100 via-white to-gray-100 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-base font-medium" style={{zIndex: 30}}>
      <span className="mr-2"> {daysLeft} day{daysLeft === 1 ? '' : 's'} left to upgrade.</span>
      <a
        href={STRIPE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-4 px-5 py-1.5 rounded-full bg-gray-900 text-white font-semibold shadow hover:bg-gray-800 transition-colors text-base"
      >
        Upgrade Now
      </a>
    </div>
  );
}