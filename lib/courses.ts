import { Course } from './types'

export const COURSES: Course[] = [
    {
        courseId: 'block-chain-basics',
        title: 'Blockchain Fundamentals & Development',
        description: 'Master the core concepts of blockchain technology, including distributed ledgers, consensus mechanisms, and smart contract development. Perfect for beginners looking to enter the blockchain space.',
        price: 199.99,
        duration: '8 weeks',
        level: 'Beginner',
        image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop&auto=format',
        features: [
            'Introduction to Blockchain Technology',
            'Cryptocurrency and Digital Assets',
            'Smart Contract Development with Solidity',
            'Hands-on Projects and Real-world Applications',
            'Industry Expert Mentorship',
            'Certificate of Completion',
            'Lifetime Access to Course Materials',
            '24/7 Community Support'
        ]
    },
    {
        courseId: 'course-v1:MaalDataLabs+maal101+2025_T1',
        title: 'Advanced Smart Contracts & DApp Development',
        description: 'Take your blockchain skills to the next level with advanced smart contract programming, DApp architecture, and enterprise blockchain solutions. Ideal for developers with basic blockchain knowledge.',
        price: 299.99,
        duration: '12 weeks',
        level: 'Advanced',
        image: 'https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=250&fit=crop&auto=format',
        features: [
            'Advanced Solidity Programming',
            'DApp Frontend Integration (React & Web3)',
            'Security Best Practices & Auditing',
            'DeFi Protocol Development',
            'NFT Marketplace Creation',
            'Professional Portfolio Projects',
            'Job Placement Assistance',
            'Advanced Certification'
        ]
    },
    {
        courseId: 'block-chain-basics',
        title: 'Advanced Blockchain Cryptography',
        description: 'Explore advanced cryptographic techniques used in blockchain systems, including zero-knowledge proofs, elliptic curve cryptography, and secure multi-party computation. Designed for professionals and enthusiasts seeking deep technical expertise.',
        price: 499,
        duration: '10 weeks',
        level: 'Advanced',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=250&fit=crop&auto=format',
        features: [
            'Zero-Knowledge Proofs & Applications',
            'Elliptic Curve Cryptography',
            'Secure Multi-Party Computation',
            'Blockchain Security Protocols',
            'Hands-on Cryptography Labs',
            'Expert Guest Lectures',
            'Certificate of Mastery',
            'Lifetime Access & Updates'
        ]
    }
]

export const getStaticCourseById = (id: string): Course | undefined => {
    return COURSES.find(course => course.courseId === id)
}
