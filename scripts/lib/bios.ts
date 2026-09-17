/**
 * Starter bios, researched from public web pages in September 2026.
 *
 * Each entry lists the pages its facts came from. Only professional facts that
 * more than one source — or the person's own site — supported are included;
 * people with no reliable public profile are deliberately absent and keep the
 * site's fallback. Roles that may have changed are phrased as of the interview.
 *
 * `pnpm db:bios` writes these only where a person's bio is still empty, so an
 * edit made in the admin panel is never overwritten.
 */
export interface SeedBio {
  name: string;
  points: string[];
  sources: string[];
}

export const BIOS: SeedBio[] = [
  {
    name: 'Shawn Flynn',
    points: [
      'Principal at Global Capital Markets, a middle-market investment bank, working on M&A and growth capital.',
      'Holds a BS in Mechanical Engineering from UC San Diego; speaks Mandarin and Spanish.',
      'Spent more than four years in Beijing, where he founded and later exited an education company.',
      'Previously led incubation at an AI and blockchain incubator and was president of a Silicon Valley angel group.',
      'Founded the TV show “Silicon Valley Successes”; has been based in Silicon Valley since 2013.'
    ],
    sources: [
      'https://www.globalcapitalmarkets.com/shawn-flynn',
      'https://speakabout.ai/speakers/shawn-flynn',
      'https://thesiliconvalleypodcast.com/about/'
    ]
  },
  {
    name: 'Sunil S Ranka',
    points: [
      'Founder of Predikly, a data and analytics company.',
      'Venture Partner at the startup accelerator znationlab, where he mentors and invests in startups.',
      'More than 20 years in the technology industry.',
      'Works across RPA, business intelligence, data warehousing, big data and machine learning.',
      'O’Reilly author and Forbes Technology Council contributor.'
    ],
    sources: [
      'https://www.oreilly.com/people/sunil-s-ranka/',
      'https://councils.forbes.com/profile/Sunil-Ranka-Founder-Predikly-LLC/bfb250e1-101c-4492-be06-3ef460c6b66f',
      'https://www.theinvestorspodcast.com/silicon-valley/sv004-robotic-process-automation-will-robots-take-our-jobs-with-sunil-ranka/'
    ]
  },
  {
    name: 'Andreas Ramos',
    points: [
      'Author of more than 20 books on digital marketing, published in several countries.',
      'Teaches applied AI for digital marketing at CSTU and has taught at Santa Clara University.',
      'Moved to Silicon Valley in 1992 and worked in engineering at SGI and Sun Microsystems.',
      'Led global SEO at Cisco.',
      'Former director of the digital agency at Acxiom.'
    ],
    sources: [
      'https://andreas.com/about.html',
      'https://dmanc.org/andreas-ramos-biography/',
      'https://www.boye-co.com/blog/2023/3/expert-of-the-month-andreas-ramos'
    ]
  },
  {
    name: 'Michael Kasperzak',
    points: [
      'Former Mountain View, California city councilmember who served two terms as mayor.',
      'Began in local government on the Parks and Recreation Commission in 1994.',
      'Earned his law degree from UC Hastings in 1982.',
      'Worked as an aviation and trial lawyer, and later as a mediator.',
      'Lewis & Clark College alumnus.'
    ],
    sources: [
      'https://arts4all.org/staff-bios/mike-kasperzak/',
      'https://www.lclark.edu/live/profiles/14982-michael-kasperzak',
      'https://www.mv-voice.com/news/2012/01/04/kasperzak-inks-named-mayor-vice-mayor/'
    ]
  },
  {
    name: 'Sergio Smirnoff',
    points: [
      'Design leader based in the San Francisco Bay Area.',
      'Led the rebranding of InOrbit, a robot fleet management startup.',
      'Has mentored at the Plug and Play, Singularity University and TechCode accelerators.'
    ],
    sources: [
      'https://sergiosmirnoff.myportfolio.com/about',
      'https://cargocollective.com/sergiosmirnoff/InOrbit-Inc'
    ]
  },
  {
    name: 'Daniel Gregoire',
    points: [
      'Founded Halon Entertainment, a visualization (previs) company, in 2003.',
      'Began his career at JAK Films at Skywalker Ranch.',
      'Was previs supervisor on Star Wars Episodes II and III.',
      'Oversaw Halon projects including War of the Worlds, Life of Pi, Birdman and Jurassic World.',
      'Halon also works in postvisualization, visual effects and VR.'
    ],
    sources: [
      'https://www.halon.com/team/daniel-gregoire/dan/',
      'https://www.imdb.com/name/nm1105260/'
    ]
  },
  {
    name: 'David Womark',
    points: [
      'American film producer.',
      'Shared a Best Picture Academy Award nomination for Life of Pi with Ang Lee and Gil Netter.',
      'Was a producer on Peter Berg’s Deepwater Horizon.',
      'Has worked on more than 35 films, including How the Grinch Stole Christmas.'
    ],
    sources: [
      'https://en.wikipedia.org/wiki/David_Womark',
      'https://www.imdb.com/name/nm0003720/bio/'
    ]
  },
  {
    name: 'Helen Pastorino',
    points: [
      'Founded Pertria, a real estate sales, investment and property management firm.',
      'Co-founded Alain Pinel Realtors in the San Francisco Bay Area.',
      'Was President and a board member of Startup Sandbox, a Santa Cruz bioscience incubator, at the time of the interview.',
      'Founded the World Tomato Society, which maintains a large database of tomato varieties.',
      'More than 40 years of experience in real estate.'
    ],
    sources: [
      'https://thesiliconvalleypodcast.com/064-growing-successful-companies-with-pertria-and-world-tomato-society-founder-helen-pastorino/'
    ]
  },
  {
    name: 'Jitendra Waral',
    points: [
      'Was Senior Research Analyst for Internet and Consumer Electronics at Bloomberg Intelligence at the time of the interview.',
      'Has covered the global technology sector: internet, consumer electronics, hardware, storage and electronics manufacturing.',
      'Earlier worked at Deloitte, Gridstone Research and the Stock Holding Corporation of India.',
      'Holds a mechanical engineering degree from the University of Mumbai and a master’s in financial mathematics from Lehigh University.'
    ],
    sources: [
      'https://siliconvalleytechpodcast.podbean.com/e/interview-of-jitendra-waral-senior-research-analyst-internet-consumer-electronics-at-bloomberg-intelligence/',
      'https://assets.bbhub.io/professional/sites/10/intelligence-Analyst-Directory.pdf'
    ]
  },
  {
    name: 'Larry Kesslin',
    points: [
      'Entrepreneur, business development consultant, speaker and author.',
      'Published “Success Redefined: When Wants Become Needs” in 2015, his third book.',
      'Took over leading SPIRE (formerly Corporate Alliance), a San Diego community of business leaders, in 2018.',
      'Has directed the annual San Diego Cause Conference, connecting nonprofits with corporate supporters.',
      'Named to the San Diego Business Journal’s SD500 list in 2022.'
    ],
    sources: [
      'https://www.sdbj.com/sd-500/2022/nonprofits-2022/sd500-2022-larry-kesslin/',
      'https://expertfile.com/experts/larry.kesslin/larry-kesslin',
      'https://larrykesslin.com/'
    ]
  },
  {
    name: 'Lou Pambianco',
    points: [
      'Was Chairman and CEO of Startup Sandbox at the time of the interview.',
      'Startup Sandbox is a bioscience incubator in Santa Cruz affiliated with UC Santa Cruz, founded in 2017.',
      'Co-founder and Managing Director of Corporate Development Partners, which advises early-stage companies.',
      'More than 35 years of experience growing high-technology companies.'
    ],
    sources: [
      'https://www.corpdevpar.com/about',
      'https://lookout.co/startup-sandbox-entrepreneurial-pipeline-santa-cruz-tech-business/story'
    ]
  },
  {
    name: 'Nigel G. Salina',
    points: [
      'International consultant and entrepreneur based in Trinidad and Tobago.',
      'Founder and Chairman of the Global Business Leadership Forum.'
    ],
    sources: [
      'https://creators.spotify.com/pod/profile/faith-and-finance-forum/episodes/Conversation-with-Nigel-Salina--Founder--Chairman-of-the-Global-Business-Leadership-Forum-e1i4n11',
      'https://ycej.yale.edu/en/conference-2023/profiles/nigel-salina'
    ]
  },
  {
    name: 'Prem Jain',
    points: [
      'Co-founded Pensando Systems in 2017 and was its CEO at the time of the interview.',
      'AMD completed its acquisition of Pensando in May 2022, valued at about $1.9 billion.',
      'Spent more than 20 years at Cisco, including as SVP and General Manager of a business unit.',
      'Part of the founding teams of Cisco spin-ins Andiamo Systems, Nuova Systems and Insieme Networks; was CEO of Insieme.',
      'Worked at Crescendo, which Cisco acquired, before joining Cisco.'
    ],
    sources: [
      'https://leadership.ucdavis.edu/people/prem-jain',
      'https://siliconangle.com/2019/10/29/cisco-alums-reunite-prem-jains-pensando-spins-edge-computing-conversation-pensandoio-guestoftheweek/',
      'https://ir.amd.com/news-events/press-releases/detail/1071/amd-expands-data-center-solutions-capabilities-with-acquisition-of-pensando'
    ]
  },
  {
    name: 'Rushabh Parmani',
    points: [
      'Co-founded Automation Anywhere in 2003 in San Jose, originally named Tethys Solutions.',
      'Was Co-Founder and Executive Vice President at the time of the interview.',
      'Has led product development, sales, customer support and professional services at the company.',
      'Began his career as a software engineer at Siebel Systems.'
    ],
    sources: [
      'https://en.wikipedia.org/wiki/Automation_Anywhere',
      'https://www.automationanywhere.com/company/blog/author/rushabh-parmani'
    ]
  }
];
