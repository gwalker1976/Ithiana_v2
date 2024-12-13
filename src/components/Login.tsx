import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    setLoading(true);
    setMessage(null);

    try {
      if (isRegistering) {
        // Jelszó ellenőrzés
        if (password !== confirmPassword) {
          setMessage('A jelszavak nem egyeznek.');
          setLoading(false);
          return;
        }

        // Regisztráció
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setMessage(`Hiba: ${error.message}`);
          setLoading(false);
          return;
        }

        // Profil létrehozása a `profiles` táblában
        const user = data.user;
        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: email,
                role: 'user',
              },
            ]);
          if (profileError) {
            setMessage(`Hiba a profil létrehozásakor: ${profileError.message}`);
            setLoading(false);
            return;
          }
        }

        setMessage('Sikeres regisztráció! Ellenőrizd az e-mail fiókod.');
      } else {
        // Bejelentkezés
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(`Hiba: ${error.message}`);
        } else {
          const user = data.user;
          // Frissítsük az email címet a profiles táblában
          if (user) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({ email: email })
              .eq('id', user.id);

            if (profileError) {
              console.error('Nem sikerült frissíteni az email címet a profilban:', profileError);
            }
          }

          navigate('/main-menu');
        }
      }
    } catch (err) {
      setMessage('Valami hiba történt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-100">
          {isRegistering ? 'Regisztráció' : 'Bejelentkezés'}
        </h2>
        {message && <p className="text-sm mb-4 text-center text-gray-300">{message}</p>}
        <input
          type="email"
          placeholder="E-mail cím"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-teal-300 focus:outline-none"
        />
        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-teal-300 focus:outline-none"
        />
        {isRegistering && (
          <input
            type="password"
            placeholder="Jelszó megerősítése"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 mb-4 border border-gray-600 rounded-lg bg-gray-700 text-gray-100 focus:ring-2 focus:ring-teal-300 focus:outline-none"
          />
        )}
        <button
          onClick={handleAuth}
          disabled={loading}
          className={`w-full py-2 mb-4 px-4 rounded-lg text-gray-100 ${
            loading ? 'bg-gray-600' : 'bg-teal-500 hover:bg-teal-600'
          } focus:outline-none focus:ring-2 focus:ring-teal-300`}
        >
          {loading
            ? 'Betöltés...'
            : isRegistering
            ? 'Regisztráció'
            : 'Bejelentkezés'}
        </button>
        <p className="text-sm text-center text-gray-200">
          {isRegistering ? (
            <>
              Már van fiókod?{' '}
              <button
                onClick={() => setIsRegistering(false)}
                className="text-teal-300 hover:underline"
              >
                Jelentkezz be
              </button>
            </>
          ) : (
            <>
              Nincs fiókod?{' '}
              <button
                onClick={() => setIsRegistering(true)}
                className="text-teal-300 hover:underline"
              >
                Regisztrálj
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
