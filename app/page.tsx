import Nav from "./sections/Nav";
import Intro from "./sections/Intro";
import Products from "./sections/Products";
import MovingWords from "./sections/MovingWords";
import Hero from "./sections/Hero";
import FeaturedProducts from "./sections/FeaturedProducts";
import FeedbackForm from "./sections/FeedbackForm";
import Footer from "./sections/Footer";
import WhatsAppButton from "../components/WhatsAppButton";

export default function Home() {
  return (
    <>
    <Nav/>
    <Hero /> 
    <MovingWords />
    <Products />
    <FeaturedProducts />
    <MovingWords />
    <Intro />
    <FeedbackForm />
    <Footer />
    <WhatsAppButton />
    </>
  );
}
