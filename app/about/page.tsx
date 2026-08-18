import type { Metadata } from 'next';
import Nav from '../sections/Nav';
import Footer from '../sections/Footer';
import Image from 'next/image';
import aboutImage from '../../public/images/about-image.jpg';
import Link from 'next/link';
import HeaderTypewriter from './HeaderTypewriter';

export const metadata: Metadata = {
  // `absolute` because this title already carries the brand; the root template
  // would otherwise append it a second time.
  title: {
    absolute: 'About Unlimited SW – Egyptian Calisthenics Equipment by Dr. Mohamed Alkady',
  },
  description:
    'Unlimited SW designs and manufactures calisthenics equipment in Egypt, founded by Dr. Mohamed Alkady, PhD in sports biomechanics with 14+ years of coaching.',
  alternates: { canonical: 'https://unlimited-sw.com/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-stone-900 text-[#b3b3b3] font-sans selection:bg-white selection:text-black flex flex-col">
      <Nav />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 pt-32 lg:pt-40 pb-24">

        {/* Animated Huge Header just like Adam Brandon */}
        <div className="mb-20 md:mb-32 lg:mb-40 max-w-6xl">
          <h1 className="text-[1rem] xs:text-[2rem] sm:text-[2rem] md:text-[4rem] lg:text-[4rem] leading-[1.05] tracking-[-0.03em] font-medium text-white">
            <HeaderTypewriter
              text="UNLIMITED is a community brand for athletes, we started our journey and we are here, we train, we coach, we compete, we teach, we sell and we grow."
              delay={300}
              speed={40}
            />
          </h1>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-24 items-start">

          {/* Left Column: Text & Button */}
          <div className="md:col-span-6 lg:col-span-5 flex flex-col space-y-8 text-base md:text-lg lg:text-[1.15rem] leading-[1.6] text-[#b3b3b3] font-medium tracking-tight">
            <p>
              Muhamed Alkady is a dedicated and dynamic sports science professional with a Ph.D. in Biomechanics in Sports Training and more than 14 years of coaching experience.
            </p>
            <p>
              Lecturer at the Faculty of Sports Sciences, Benha University, and Founder of Gravity Benha for Calisthenics training, he specializes in the training and development of professional athletes.
            </p>
            <p>
              Involved in ongoing scientific research and academic publishing, Muhamed focuses on advancing practical and theoretical knowledge in calisthenics, gymnastics, and biomechanics.
            </p>

            <div className="pt-8 flex items-center">
              <Link href="/shop" className="inline-flex items-center text-sm font-bold uppercase tracking-[0.15em] text-white hover:opacity-60 transition-opacity pb-1 border-b-2 border-white group">
                Explore Equipments
                <svg aria-hidden="true" className="w-4 h-4 ml-3 transform group-hover:translate-x-1 transition-transform motion-reduce:transform-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column: Grayscale Image */}
          <div className="md:col-span-6 lg:col-span-7 w-full relative aspect-[4/5] bg-stone-800">
            <Image
              src={aboutImage}
              alt="Muhamed Alkady, founder of UNLIMITED, coaching calisthenics"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover grayscale hover:grayscale-0 transition-all duration-[1000ms] ease-in-out motion-reduce:transition-none"
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
