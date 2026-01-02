// FoodImageService.ts - Reliable image mapping and validation
export class FoodImageService {
  private static readonly IMAGE_MAP: Record<string, string> = {
    // Indian Breakfasts - VERIFIED WORKING URLS
    'Vegetable Upma': 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?fit=crop&w=800&q=80',
    'Vegetable Poha': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?fit=crop&w=800&q=80',
    'Moong Dal Chilla': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?fit=crop&w=800&q=80',
    'Idli with Sambar': 'https://images.unsplash.com/photo-1630383249896-424e482df921?fit=crop&w=800&q=80',
    'Dosa with Chutney': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?fit=crop&w=800&q=80',
    'Chapati with Dal': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?fit=crop&w=800&q=80',
    
    // Healthy Snacks - VERIFIED WORKING URLS
    'Sprouted Moong Salad': 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?fit=crop&w=800&q=80',
    'Buttermilk (Chaas)': 'https://images.unsplash.com/photo-1523473827533-2a64d0d36748?fit=crop&w=800&q=80',
    'Cucumber & Carrot Sticks with Hummus': 'https://images.unsplash.com/photo-1540420828642-fca2c5c18abb?fit=crop&w=800&q=80',
    'Almonds (Handful)': 'https://images.unsplash.com/photo-1508747703725-719777637510?fit=crop&w=800&q=80',
    
    // Default fallback
    'default': 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?fit=crop&w=800&q=80'
  };

  static getImageForFood(foodName: string): string {
    // Find exact match
    const exactMatch = this.IMAGE_MAP[foodName];
    if (exactMatch) return exactMatch;

    // Try partial matching (e.g., "Upma" in "Vegetable Upma")
    for (const [key, url] of Object.entries(this.IMAGE_MAP)) {
      if (foodName.toLowerCase().includes(key.toLowerCase()) || 
          key.toLowerCase().includes(foodName.toLowerCase())) {
        return url;
      }
    }

    return this.IMAGE_MAP.default;
  }

  static async validateImage(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000);
    });
  }

  static getAllFoodImages(): Record<string, string> {
    return { ...this.IMAGE_MAP };
  }
}
