import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Quote } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/testimonials`);
        if (response.data && response.data.length > 0) {
          setTestimonials(response.data);
        }
      } catch (error) {
        // no testimonials found;
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ne pas afficher la section s'il n'y a pas de témoignages
  if (loading) return null;
  if (testimonials.length === 0) return null;
  
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors duration-300">
            Témoignages
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Ce qu'ils disent de nous
          </h2>
        </div>
        
        <div className={`grid gap-8 ${testimonials.length === 1 ? 'max-w-xl mx-auto' : 'md:grid-cols-2'}`}>
          {testimonials.map((testimonial, index) => (
            <Card 
              key={testimonial._id || index} 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-gray-100 group relative overflow-hidden"
            >
              <Quote className="absolute top-6 right-6 w-12 h-12 text-gray-200 group-hover:text-[#2d5a4d]/20 transition-colors duration-300" />
              
              <div className="relative z-10">
                <p className="text-xl text-gray-700 mb-6 leading-relaxed font-medium">
                  "{testimonial.text}"
                </p>
                
                <div className="flex items-center">
                  <Avatar className="w-12 h-12 mr-4">
                    <AvatarFallback className={`${testimonial.color || 'bg-[#2d5a4d]'} text-white font-semibold`}>
                      {testimonial.initial || testimonial.author?.charAt(0) || 'U'}
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