import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    text: 'Grâce à GreenLink, j\'ai augmenté mes revenus de 40% avec les primes carbone.',
    author: 'Kouadio Yao',
    role: 'Producteur de cacao, Soubré',
    initial: 'K',
    color: 'bg-amber-600'
  },
  {
    text: 'La traçabilité nous a permis d\'accéder aux marchés européens premium.',
    author: 'Aminata Koné',
    role: 'Coopérative COOP-CA, Daloa',
    initial: 'A',
    color: 'bg-emerald-600'
  }
];

const TestimonialsSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors duration-300">
            Témoignages
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Ils nous font confiance
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-gray-100 group relative overflow-hidden"
            >
              <Quote className="absolute top-6 right-6 w-12 h-12 text-gray-200 group-hover:text-[#2d5a4d]/20 transition-colors duration-300" />
              
              <div className="relative z-10">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed font-medium">
                  "{testimonial.text}"
                </p>
                
                <div className="flex items-center">
                  <Avatar className="w-12 h-12 mr-4">
                    <AvatarFallback className={`${testimonial.color} text-white font-semibold`}>
                      {testimonial.initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;