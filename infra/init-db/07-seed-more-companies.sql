-- ============================================================================
-- DECODING JOBS — Phase 3: Comprehensive company data
-- Real tech companies across Bangalore & Chennai neighborhoods
-- ============================================================================

-- Additional Bangalore companies (unique coordinates across the city)
INSERT INTO companies (name, description, address, location, sector, area, city, founded_year, team_size, total_funding, stage, status, website_url, linkedin_url, logo_url)
VALUES
    -- HSR Layout cluster
    ('Groww', 'Investment platform for mutual funds and stocks.', 'HSR Layout, Bengaluru', ST_SetSRID(ST_MakePoint(77.6370, 12.9120), 4326), 'Fintech', 'HSR Layout', 'Bengaluru', 2016, '1000+', '$393M', 'Growth', 'active', 'https://groww.in', 'https://linkedin.com/company/groww', 'https://www.google.com/s2/favicons?domain=groww.in&sz=128'),
    ('Navi Technologies', 'Digital lending and insurance platform.', 'HSR Layout, Bengaluru', ST_SetSRID(ST_MakePoint(77.6355, 12.9140), 4326), 'Fintech', 'HSR Layout', 'Bengaluru', 2018, '500+', '$380M', 'Growth', 'active', 'https://navi.com', 'https://linkedin.com/company/navi-technologies', 'https://www.google.com/s2/favicons?domain=navi.com&sz=128'),
    ('Dukaan', 'E-commerce store builder for small businesses.', 'HSR Layout, Bengaluru', ST_SetSRID(ST_MakePoint(77.6385, 12.9105), 4326), 'SaaS', 'HSR Layout', 'Bengaluru', 2020, '50-100', '$6M', 'Series A', 'active', 'https://dukaan.app', 'https://linkedin.com/company/dukaan', 'https://www.google.com/s2/favicons?domain=dukaan.app&sz=128'),

    -- Koramangala cluster
    ('Razorpay', 'Full-stack payments platform for Indian businesses.', 'Koramangala, Bengaluru', ST_SetSRID(ST_MakePoint(77.6245, 12.9352), 4326), 'Fintech', 'Koramangala', 'Bengaluru', 2014, '500+', '$741M', 'Growth', 'active', 'https://razorpay.com', 'https://linkedin.com/company/razorpay', 'https://www.google.com/s2/favicons?domain=razorpay.com&sz=128'),
    ('CRED', 'Premium credit card management and payments platform.', 'Koramangala 5th Block, Bengaluru', ST_SetSRID(ST_MakePoint(77.6210, 12.9348), 4326), 'Fintech', 'Koramangala', 'Bengaluru', 2018, '500+', '$387M', 'Growth', 'active', 'https://cred.club', 'https://linkedin.com/company/cred', 'https://www.google.com/s2/favicons?domain=cred.club&sz=128'),
    ('Innovex Technologies', 'AI-driven analytics platform for smart cities.', 'Koramangala 4th Block, Bengaluru', ST_SetSRID(ST_MakePoint(77.6260, 12.9390), 4326), 'AI', 'Koramangala', 'Bengaluru', 2021, '11-50', 'Seed', 'Seed', 'active', 'https://innovex.tech', 'https://linkedin.com/company/innovex', 'https://www.google.com/s2/favicons?domain=innovex.tech&sz=128'),
    ('Unacademy', 'Online learning platform for competitive exams.', 'Koramangala, Bengaluru', ST_SetSRID(ST_MakePoint(77.6220, 12.9375), 4326), 'Edtech', 'Koramangala', 'Bengaluru', 2015, '1000+', '$880M', 'Growth', 'active', 'https://unacademy.com', 'https://linkedin.com/company/unacademy', 'https://www.google.com/s2/favicons?domain=unacademy.com&sz=128'),
    ('NeoGrowth', 'Digital lending for small businesses.', 'Koramangala, Bengaluru', ST_SetSRID(ST_MakePoint(77.6235, 12.9360), 4326), 'Fintech', 'Koramangala', 'Bengaluru', 2014, '500+', '$200M', 'Growth', 'active', 'https://neogrowth.in', 'https://linkedin.com/company/neogrowth', 'https://www.google.com/s2/favicons?domain=neogrowth.in&sz=128'),

    -- Bellandur / Outer Ring Road cluster
    ('Freshworks', 'Cloud-based SaaS for customer engagement.', 'Bellandur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6691, 12.9279), 4326), 'SaaS', 'Bellandur', 'Bengaluru', 2010, '500+', '$424M', 'Public', 'active', 'https://freshworks.com', 'https://linkedin.com/company/freshworks', 'https://www.google.com/s2/favicons?domain=freshworks.com&sz=128'),
    ('PhonePe', 'Digital payments platform built on UPI.', 'Outer Ring Road, Bellandur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6730, 12.9250), 4326), 'Fintech', 'Bellandur', 'Bengaluru', 2015, '500+', '$1.7B', 'Growth', 'active', 'https://phonepe.com', 'https://linkedin.com/company/phonepe', 'https://www.google.com/s2/favicons?domain=phonepe.com&sz=128'),
    ('Birlasoft', 'IT services and digital transformation.', 'Bellandur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6710, 12.9265), 4326), 'Other', 'Bellandur', 'Bengaluru', 1995, '1000+', 'Public', 'Public', 'active', 'https://birlasoft.com', 'https://linkedin.com/company/birlasoft', 'https://www.google.com/s2/favicons?domain=birlasoft.com&sz=128'),
    ('Sprinklr', 'Unified customer experience management platform.', 'Bellandur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6680, 12.9295), 4326), 'SaaS', 'Bellandur', 'Bengaluru', 2011, '500+', '$400M', 'Public', 'active', 'https://sprinklr.com', 'https://linkedin.com/company/sprinklr', 'https://www.google.com/s2/favicons?domain=sprinklr.com&sz=128'),
    ('Zenoti', 'Software for fitness and wellness businesses.', 'Bellandur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6700, 12.9285), 4326), 'SaaS', 'Bellandur', 'Bengaluru', 2012, '500+', '$257M', 'Growth', 'active', 'https://zenoti.com', 'https://linkedin.com/company/zenoti', 'https://www.google.com/s2/favicons?domain=zenoti.com&sz=128'),

    -- Whitefield cluster
    ('Wipro', 'IT services, consulting, and digital transformation.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7500, 12.9700), 4326), 'Other', 'Whitefield', 'Bengaluru', 1945, '1000+', 'Public', 'Public', 'active', 'https://wipro.com', 'https://linkedin.com/company/wipro', 'https://www.google.com/s2/favicons?domain=wipro.com&sz=128'),
    ('Intel India', 'Semiconductor and technology R&D center.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7480, 12.9720), 4326), 'Other', 'Whitefield', 'Bengaluru', 1999, '1000+', 'Public', 'Public', 'active', 'https://intel.com', 'https://linkedin.com/company/intel', 'https://www.google.com/s2/favicons?domain=intel.com&sz=128'),
    ('SAP Labs India', 'Enterprise software and cloud solutions.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7520, 12.9680), 4326), 'SaaS', 'Whitefield', 'Bengaluru', 1998, '1000+', 'Public', 'Public', 'active', 'https://sap.com', 'https://linkedin.com/company/sap', 'https://www.google.com/s2/favicons?domain=sap.com&sz=128'),
    ('Target India', 'Retail technology and e-commerce platform.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7490, 12.9690), 4326), 'Consumer', 'Whitefield', 'Bengaluru', 2003, '1000+', 'Public', 'Public', 'active', 'https://target.com', 'https://linkedin.com/company/target-corporation', 'https://www.google.com/s2/favicons?domain=target.com&sz=128'),
    ('ByteForge Solutions', 'Cloud-native development consultancy.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7510, 12.9710), 4326), 'Other', 'Whitefield', 'Bengaluru', 2022, '11-50', 'Seed', 'Seed', 'active', 'https://byteforge.io', 'https://linkedin.com/company/byteforge', 'https://www.google.com/s2/favicons?domain=byteforge.io&sz=128'),

    -- Electronic City cluster
    ('Flipkart', 'India''s leading e-commerce marketplace.', 'Electronic City Phase 1, Bengaluru', ST_SetSRID(ST_MakePoint(77.6610, 12.8430), 4326), 'Consumer', 'Electronic City', 'Bengaluru', 2007, '1000+', 'Walmart', 'Public', 'active', 'https://flipkart.com', 'https://linkedin.com/company/flipkart', 'https://www.google.com/s2/favicons?domain=flipkart.com&sz=128'),
    ('Infosys', 'IT consulting and software development.', 'Electronic City, Bengaluru', ST_SetSRID(ST_MakePoint(77.6630, 12.8410), 4326), 'Other', 'Electronic City', 'Bengaluru', 1981, '1000+', 'Public', 'Public', 'active', 'https://infosys.com', 'https://linkedin.com/company/infosys', 'https://www.google.com/s2/favicons?domain=infosys.com&sz=128'),
    ('Biocon', 'Biopharmaceutical and life sciences company.', 'Electronic City, Bengaluru', ST_SetSRID(ST_MakePoint(77.6640, 12.8420), 4326), 'Healthtech', 'Electronic City', 'Bengaluru', 1978, '1000+', 'Public', 'Public', 'active', 'https://biocon.com', 'https://linkedin.com/company/biocon', 'https://www.google.com/s2/favicons?domain=biocon.com&sz=128'),

    -- Sarjapur Road cluster
    ('Postman', 'API development platform used by 30M+ developers.', 'Sarjapur Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6710, 12.9185), 4326), 'SaaS', 'Sarjapur Road', 'Bengaluru', 2014, '500+', '$430M', 'Growth', 'active', 'https://postman.com', 'https://linkedin.com/company/postman', 'https://www.google.com/s2/favicons?domain=postman.com&sz=128'),
    ('Highradius', 'AI-powered order-to-cash and treasury management.', 'Indiranagar, Bengaluru', ST_SetSRID(ST_MakePoint(77.6419, 12.9741), 4326), 'SaaS', 'Sarjapur Road', 'Bengaluru', 2006, '500+', '$300M', 'Growth', 'active', 'https://highradius.com', 'https://linkedin.com/company/highradius', 'https://www.google.com/s2/favicons?domain=highradius.com&sz=128'),
    ('Whatfix', 'Digital adoption platform for enterprise software.', 'Sarjapur Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6720, 12.9200), 4326), 'SaaS', 'Sarjapur Road', 'Bengaluru', 2012, '500+', '$165M', 'Growth', 'active', 'https://whatfix.com', 'https://linkedin.com/company/whatfix', 'https://www.google.com/s2/favicons?domain=whatfix.com&sz=128'),

    -- MG Road / Central Bengaluru
    ('Swiggy', 'On-demand delivery platform.', 'MG Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6090, 12.9739), 4326), 'Consumer', 'MG Road', 'Bengaluru', 2014, '5000+', '$1.3B', 'Growth', 'active', 'https://swiggy.com', 'https://linkedin.com/company/swiggy', 'https://www.google.com/s2/favicons?domain=swiggy.com&sz=128'),
    ('MakeMyTrip', 'Online travel company.', 'MG Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6110, 12.9755), 4326), 'Consumer', 'MG Road', 'Bengaluru', 2000, '1000+', 'Public', 'Public', 'active', 'https://makemytrip.com', 'https://linkedin.com/company/makemytrip', 'https://www.google.com/s2/favicons?domain=makemytrip.com&sz=128'),
    ('Ola Mobility', 'Ride-hailing and electric vehicle platform.', 'MG Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6100, 12.9730), 4326), 'Consumer', 'MG Road', 'Bengaluru', 2010, '5000+', '$4.5B', 'Growth', 'active', 'https://olacabs.com', 'https://linkedin.com/company/ola', 'https://www.google.com/s2/favicons?domain=olacabs.com&sz=128'),

    -- Indiranagar cluster
    ('Dunzo', 'Hyperlocal delivery and concierge service.', 'Indiranagar, Bengaluru', ST_SetSRID(ST_MakePoint(77.6405, 12.9760), 4326), 'Consumer', 'Indiranagar', 'Bengaluru', 2015, '500+', '$240M', 'Growth', 'active', 'https://dunzo.com', 'https://linkedin.com/company/dunzo', 'https://www.google.com/s2/favicons?domain=dunzo.com&sz=128'),
    ('Licious', 'Fresh meat and seafood delivery platform.', 'Indiranagar, Bengaluru', ST_SetSRID(ST_MakePoint(77.6425, 12.9750), 4326), 'Consumer', 'Indiranagar', 'Bengaluru', 2015, '500+', '$490M', 'Growth', 'active', 'https://licious.in', 'https://linkedin.com/company/licious', 'https://www.google.com/s2/favicons?domain=licious.in&sz=128'),
    ('CitiusTech', 'Healthcare technology and digital solutions.', 'Indiranagar, Bengaluru', ST_SetSRID(ST_MakePoint(77.6415, 12.9745), 4326), 'Healthtech', 'Indiranagar', 'Bengaluru', 2005, '500+', '$100M', 'Growth', 'active', 'https://ciustech.com', 'https://linkedin.com/company/ciustech', 'https://www.google.com/s2/favicons?domain=ciustech.com&sz=128'),

    -- Bannerghatta Road
    ('Zerodha', 'India''s largest retail stockbroker.', 'Bannerghatta Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6008, 12.9315), 4326), 'Fintech', 'Bannerghatta Road', 'Bengaluru', 2010, '500+', 'Bootstrapped', 'Growth', 'active', 'https://zerodha.com', 'https://linkedin.com/company/zerodha', 'https://www.google.com/s2/favicons?domain=zerodha.com&sz=128'),
    ('SimpliLearn', 'Online professional certification courses.', 'Bannerghatta Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.5990, 12.9330), 4326), 'Edtech', 'Bannerghatta Road', 'Bengaluru', 2010, '1000+', '$230M', 'Growth', 'active', 'https://simplilearn.com', 'https://linkedin.com/company/simplilearn', 'https://www.google.com/s2/favicons?domain=simplilearn.com&sz=128'),

    -- Marathahalli cluster
    ('Rubrik', 'Cybersecurity and data management platform.', 'Marathahalli, Bengaluru', ST_SetSRID(ST_MakePoint(77.6954, 12.9435), 4326), 'SaaS', 'Marathahalli', 'Bengaluru', 2014, '500+', '$504M', 'Public', 'active', 'https://rubrik.com', 'https://linkedin.com/company/rubrik', 'https://www.google.com/s2/favicons?domain=rubrik.com&sz=128'),
    ('Cisco India', 'Networking hardware and software solutions.', 'Marathahalli, Bengaluru', ST_SetSRID(ST_MakePoint(77.6970, 12.9420), 4326), 'Other', 'Marathahalli', 'Bengaluru', 1995, '1000+', 'Public', 'Public', 'active', 'https://cisco.com', 'https://linkedin.com/company/cisco', 'https://www.google.com/s2/favicons?domain=cisco.com&sz=128'),
    ('Vistaprint India', 'Custom printing and marketing solutions.', 'Marathahalli, Bengaluru', ST_SetSRID(ST_MakePoint(77.6940, 12.9450), 4326), 'Consumer', 'Marathahalli', 'Bengaluru', 2008, '500+', 'Public', 'Public', 'active', 'https://vistaprint.in', 'https://linkedin.com/company/vistaprint', 'https://www.google.com/s2/favicons?domain=vistaprint.in&sz=128'),

    -- Domlur / old airport road
    ('Atlassian Bengaluru', 'Enterprise software for project management.', 'Embassy Golf Links, Domlur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6480, 12.9620), 4326), 'SaaS', 'Domlur', 'Bengaluru', 2002, '1000+', 'Public', 'Public', 'active', 'https://atlassian.com', 'https://linkedin.com/company/atlassian', 'https://www.google.com/s2/favicons?domain=atlassian.com&sz=128'),
    ('ThoughtSpot', 'AI-powered analytics and business intelligence.', 'Domlur, Bengaluru', ST_SetSRID(ST_MakePoint(77.6470, 12.9610), 4326), 'AI', 'Domlur', 'Bengaluru', 2012, '500+', '$670M', 'Growth', 'active', 'https://thoughtspot.com', 'https://linkedin.com/company/thoughtspot', 'https://www.google.com/s2/favicons?domain=thoughtspot.com&sz=128'),

    -- HSR Layout
    ('Dream11', 'Fantasy sports platform with 200M+ users.', 'HSR Layout, Bengaluru', ST_SetSRID(ST_MakePoint(77.6368, 12.9152), 4326), 'Consumer', 'HSR Layout', 'Bengaluru', 2008, '500+', '$825M', 'Growth', 'active', 'https://dream11.com', 'https://linkedin.com/company/dream11', 'https://www.google.com/s2/favicons?domain=dream11.com&sz=128'),
    ('Meesho', 'E-commerce platform for social commerce.', 'HSR Layout Sector 2, Bengaluru', ST_SetSRID(ST_MakePoint(77.6390, 12.9110), 4326), 'Consumer', 'HSR Layout', 'Bengaluru', 2015, '5000+', '$931M', 'Growth', 'active', 'https://meesho.com', 'https://linkedin.com/company/meesho', 'https://www.google.com/s2/favicons?domain=meesho.com&sz=128'),
    ('Porter', 'Intra-city logistics and goods transport.', 'HSR Layout, Bengaluru', ST_SetSRID(ST_MakePoint(77.6375, 12.9130), 4326), 'Consumer', 'HSR Layout', 'Bengaluru', 2014, '500+', '$80M', 'Growth', 'active', 'https://theporter.in', 'https://linkedin.com/company/porter', 'https://www.google.com/s2/favicons?domain=theporter.in&sz=128'),
    ('Hasura', 'GraphQL engine and API platform.', 'HSR Layout, Bengaluru', ST_SetSRID(ST_MakePoint(77.6360, 12.9145), 4326), 'SaaS', 'HSR Layout', 'Bengaluru', 2017, '50-100', '$100M', 'Growth', 'active', 'https://hasura.io', 'https://linkedin.com/company/hasura', 'https://www.google.com/s2/favicons?domain=hasura.io&sz=128'),

    -- Outer Ring Road / Manyata cluster
    ('Nagarro', 'Digital product engineering and IT services.', 'Manyata Tech Park, Bengaluru', ST_SetSRID(ST_MakePoint(77.6150, 13.0350), 4326), 'Other', 'Outer Ring Road', 'Bengaluru', 1996, '1000+', 'Public', 'Public', 'active', 'https://nagarro.com', 'https://linkedin.com/company/nagarro', 'https://www.google.com/s2/favicons?domain=nagarro.com&sz=128'),
    ('Aviso AI', 'Revenue intelligence and predictive forecasting.', 'Outer Ring Road, Bengaluru', ST_SetSRID(ST_MakePoint(77.6160, 13.0340), 4326), 'AI', 'Outer Ring Road', 'Bengaluru', 2018, '100-500', '$45M', 'Series B', 'active', 'https://aviso.com', 'https://linkedin.com/company/aviso', 'https://www.google.com/s2/favicons?domain=aviso.com&sz=128'),

    -- Rajajinagar / Malleshwaram
    ('FreshToHome', 'Fresh fish and meat delivery platform.', 'Rajajinagar, Bengaluru', ST_SetSRID(ST_MakePoint(77.5580, 12.9930), 4326), 'Consumer', 'Rajajinagar', 'Bengaluru', 2015, '500+', '$150M', 'Growth', 'active', 'https://freshtohome.com', 'https://linkedin.com/company/freshtohome', 'https://www.google.com/s2/favicons?domain=freshtohome.com&sz=128'),

    -- JP Nagar / Jayanagar
    ('Blackbuck', 'Online trucking and logistics marketplace.', 'JP Nagar, Bengaluru', ST_SetSRID(ST_MakePoint(77.5850, 12.8950), 4326), 'Consumer', 'JP Nagar', 'Bengaluru', 2015, '500+', '$340M', 'Growth', 'active', 'https://blackbuck.com', 'https://linkedin.com/company/blackbuck', 'https://www.google.com/s2/favicons?domain=blackbuck.com&sz=128'),

    -- Whitefield (additional)
    ('Sigmoid', 'Data engineering and analytics company.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7470, 12.9730), 4326), 'AI', 'Whitefield', 'Bengaluru', 2015, '500+', '$50M', 'Growth', 'active', 'https://sigmoid.com', 'https://linkedin.com/company/sigmoid', 'https://www.google.com/s2/favicons?domain=sigmoid.com&sz=128'),
    ('MindTickle', 'Sales readiness and enablement platform.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7530, 12.9670), 4326), 'SaaS', 'Whitefield', 'Bengaluru', 2011, '500+', '$150M', 'Growth', 'active', 'https://mindtickle.com', 'https://linkedin.com/company/mindtickle', 'https://www.google.com/s2/favicons?domain=mindtickle.com&sz=128'),
    ('Capillary Technologies', 'AI-powered customer engagement platform.', 'Whitefield, Bengaluru', ST_SetSRID(ST_MakePoint(77.7540, 12.9660), 4326), 'SaaS', 'Whitefield', 'Bengaluru', 2008, '500+', '$100M', 'Growth', 'active', 'https://capillarytech.com', 'https://linkedin.com/company/capillary-technologies', 'https://www.google.com/s2/favicons?domain=capillarytech.com&sz=128'),

    -- Koramangala (additional)
    ('Pluang', 'Fractional investing in US stocks and crypto.', 'Koramangala, Bengaluru', ST_SetSRID(ST_MakePoint(77.6255, 12.9385), 4326), 'Fintech', 'Koramangala', 'Bengaluru', 2019, '100-500', '$30M', 'Series A', 'active', 'https://pluang.com', 'https://linkedin.com/company/pluang', 'https://www.google.com/s2/favicons?domain=pluang.com&sz=128'),
    ('Vogo', 'Scooter and bike rental platform.', 'Koramangala, Bengaluru', ST_SetSRID(ST_MakePoint(77.6240, 12.9365), 4326), 'Consumer', 'Koramangala', 'Bengaluru', 2016, '100-500', '$65M', 'Growth', 'active', 'https://vogo.in', 'https://linkedin.com/company/vogo', 'https://www.google.com/s2/favicons?domain=vogo.in&sz=128')
ON CONFLICT (name) DO NOTHING;

-- Additional Chennai companies
INSERT INTO companies (name, description, address, location, sector, area, city, founded_year, team_size, total_funding, stage, status, website_url, linkedin_url, logo_url)
VALUES
    -- OMR / IT Corridor
    ('Zoho Corporation', 'Cloud-based business software suite.', 'Estancia IT Park, OMR, Chennai', ST_SetSRID(ST_MakePoint(80.2200, 12.8350), 4326), 'SaaS', 'OMR', 'Chennai', 1996, '1000+', 'Bootstrapped', 'Growth', 'active', 'https://zoho.com', 'https://linkedin.com/company/zoho', 'https://www.google.com/s2/favicons?domain=zoho.com&sz=128'),
    ('Freshworks Chennai', 'Cloud-based SaaS for customer engagement.', 'Velachery, Chennai', ST_SetSRID(ST_MakePoint(80.2180, 12.9844), 4326), 'SaaS', 'Velachery', 'Chennai', 2010, '500+', '$424M', 'Public', 'active', 'https://freshworks.com', 'https://linkedin.com/company/freshworks', 'https://www.google.com/s2/favicons?domain=freshworks.com&sz=128'),
    ('Kissflow', 'Workflow automation platform.', 'SP Infocity, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2380, 12.9680), 4326), 'SaaS', 'IT Corridor', 'Chennai', 2012, '100-500', '$56M', 'Series B', 'active', 'https://kissflow.com', 'https://linkedin.com/company/kissflow', 'https://www.google.com/s2/favicons?domain=kissflow.com&sz=128'),
    ('Chargebee', 'Subscription billing and revenue management.', 'SP Infocity, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2390, 12.9690), 4326), 'SaaS', 'IT Corridor', 'Chennai', 2011, '500+', '$254M', 'Growth', 'active', 'https://chargebee.com', 'https://linkedin.com/company/chargebee', 'https://www.google.com/s2/favicons?domain=chargebee.com&sz=128'),
    ('Amazon Chennai', 'E-commerce, cloud computing (AWS).', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2370, 12.9670), 4326), 'Consumer', 'IT Corridor', 'Chennai', 2005, '1000+', 'Public', 'Public', 'active', 'https://amazon.in', 'https://linkedin.com/company/amazon', 'https://www.google.com/s2/favicons?domain=amazon.in&sz=128'),
    ('Google Chennai', 'Search, cloud, AI/ML technology.', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2360, 12.9660), 4326), 'AI', 'IT Corridor', 'Chennai', 2004, '1000+', 'Public', 'Public', 'active', 'https://google.com', 'https://linkedin.com/company/google', 'https://www.google.com/s2/favicons?domain=google.com&sz=128'),
    ('Microsoft Chennai', 'Productivity software, Azure cloud.', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2350, 12.9650), 4326), 'SaaS', 'IT Corridor', 'Chennai', 2001, '1000+', 'Public', 'Public', 'active', 'https://microsoft.com', 'https://linkedin.com/company/microsoft', 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=128'),
    ('Oracle Chennai', 'Enterprise software, cloud infrastructure.', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2340, 12.9640), 4326), 'SaaS', 'IT Corridor', 'Chennai', 1997, '1000+', 'Public', 'Public', 'active', 'https://oracle.com', 'https://linkedin.com/company/oracle', 'https://www.google.com/s2/favicons?domain=oracle.com&sz=128'),
    ('Uber Chennai', 'Ride-hailing technology platform.', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2330, 12.9630), 4326), 'Consumer', 'IT Corridor', 'Chennai', 2013, '500+', 'Public', 'Public', 'active', 'https://uber.com', 'https://linkedin.com/company/uber', 'https://www.google.com/s2/favicons?domain=uber.com&sz=128'),
    ('Dell Chennai', 'Computer hardware and IT infrastructure.', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2320, 12.9620), 4326), 'Other', 'IT Corridor', 'Chennai', 2001, '1000+', 'Public', 'Public', 'active', 'https://dell.com', 'https://linkedin.com/company/dell', 'https://www.google.com/s2/favicons?domain=dell.com&sz=128'),
    ('Thoughtworks Chennai', 'Software consultancy and digital transformation.', 'DLF Cyber City, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2310, 12.9610), 4326), 'SaaS', 'IT Corridor', 'Chennai', 2007, '500+', 'Public', 'Public', 'active', 'https://thoughtworks.com', 'https://linkedin.com/company/thoughtworks', 'https://www.google.com/s2/favicons?domain=thoughtworks.com&sz=128'),
    ('Freshdesk', 'Customer support software.', 'Thoraipakkam, Chennai', ST_SetSRID(ST_MakePoint(80.2290, 12.9590), 4326), 'SaaS', 'IT Corridor', 'Chennai', 2010, '500+', '$424M', 'Public', 'active', 'https://freshworks.com', 'https://linkedin.com/company/freshworks', 'https://www.google.com/s2/favicons?domain=freshworks.com&sz=128'),

    -- Tidel Park / OMR cluster
    ('Cognizant Chennai', 'Digital transformation consulting.', 'Thoraipakkam, Chennai', ST_SetSRID(ST_MakePoint(80.2345, 12.9410), 4326), 'Other', 'OMR', 'Chennai', 2001, '1000+', 'Public', 'Public', 'active', 'https://cognizant.com', 'https://linkedin.com/company/cognizant', 'https://www.google.com/s2/favicons?domain=cognizant.com&sz=128'),
    ('Wipro Chennai', 'IT services and digital transformation.', 'SP Infocity, Perungudi, Chennai', ST_SetSRID(ST_MakePoint(80.2375, 12.9675), 4326), 'Other', 'IT Corridor', 'Chennai', 1997, '1000+', 'Public', 'Public', 'active', 'https://wipro.com', 'https://linkedin.com/company/wipro', 'https://www.google.com/s2/favicons?domain=wipro.com&sz=128'),
    ('HCLTech Chennai', 'IT services and consulting.', 'Sholinganallur, Chennai', ST_SetSRID(ST_MakePoint(80.2270, 12.9010), 4326), 'Other', 'OMR', 'Chennai', 2001, '1000+', 'Public', 'Public', 'active', 'https://hcltech.com', 'https://linkedin.com/company/hcltech', 'https://www.google.com/s2/favicons?domain=hcltech.com&sz=128'),
    ('Infosys Chennai', 'IT consulting and software development.', 'Sholinganallur, Chennai', ST_SetSRID(ST_MakePoint(80.2260, 12.9000), 4326), 'Other', 'OMR', 'Chennai', 1997, '1000+', 'Public', 'Public', 'active', 'https://infosys.com', 'https://linkedin.com/company/infosys', 'https://www.google.com/s2/favicons?domain=infosys.com&sz=128'),

    -- Velachery cluster
    ('Visteon India', 'Automotive electronics and embedded systems.', 'Velachery, Chennai', ST_SetSRID(ST_MakePoint(80.2170, 12.9854), 4326), 'Other', 'Velachery', 'Chennai', 2000, '500+', 'Public', 'Public', 'active', 'https://visteon.com', 'https://linkedin.com/company/visteon', 'https://www.google.com/s2/favicons?domain=visteon.com&sz=128'),
    ('Paytm Chennai', 'Digital payments platform.', 'Anna Salai, Chennai', ST_SetSRID(ST_MakePoint(80.2570, 13.0540), 4326), 'Fintech', 'Nungambakkam', 'Chennai', 2015, '500+', '$3.5B', 'Growth', 'active', 'https://paytm.com', 'https://linkedin.com/company/paytm', 'https://www.google.com/s2/favicons?domain=paytm.com&sz=128'),
    ('SBI Cards', 'India''s second-largest credit card issuer.', 'Royapettah, Chennai', ST_SetSRID(ST_MakePoint(80.2676, 13.0518), 4326), 'Fintech', 'T. Nagar', 'Chennai', 1998, '500+', 'Public', 'Public', 'active', 'https://sbicard.com', 'https://linkedin.com/company/sbi-cards', 'https://www.google.com/s2/favicons?domain=sbicard.com&sz=128'),

    -- Nungambakkam / T Nagar
    ('TCS Chennai', 'IT consulting and digital transformation.', 'Nungambakkam, Chennai', ST_SetSRID(ST_MakePoint(80.2478, 13.0618), 4326), 'Other', 'Nungambakkam', 'Chennai', 1968, '1000+', 'Public', 'Public', 'active', 'https://tcs.com', 'https://linkedin.com/company/tcs', 'https://www.google.com/s2/favicons?domain=tcs.com&sz=128'),
    ('Mphasis', 'IT services and cloud solutions.', 'Nungambakkam, Chennai', ST_SetSRID(ST_MakePoint(80.2468, 13.0608), 4326), 'Other', 'Nungambakkam', 'Chennai', 2000, '500+', 'Public', 'Public', 'active', 'https://mphasis.com', 'https://linkedin.com/company/mphasis', 'https://www.google.com/s2/favicons?domain=mphasis.com&sz=128'),
    ('L&T Technology Services', 'Engineering R&D services.', 'Nungambakkam, Chennai', ST_SetSRID(ST_MakePoint(80.2458, 13.0598), 4326), 'Other', 'Nungambakkam', 'Chennai', 2012, '1000+', 'Public', 'Public', 'active', 'https://ltts.com', 'https://linkedin.com/company/lt-technology-services', 'https://www.google.com/s2/favicons?domain=ltts.com&sz=128'),

    -- Sholinganallur (additional)
    ('Zoho One', 'All-in-one business software suite.', 'Sholinganallur, Chennai', ST_SetSRID(ST_MakePoint(80.2250, 12.8990), 4326), 'SaaS', 'OMR', 'Chennai', 2017, '500+', 'Bootstrapped', 'Growth', 'active', 'https://zoho.com', 'https://linkedin.com/company/zoho', 'https://www.google.com/s2/favicons?domain=zoho.com&sz=128'),
    ('VAYU Robotics', 'Autonomous delivery robot company.', 'Sholinganallur, Chennai', ST_SetSRID(ST_MakePoint(80.2240, 12.8980), 4326), 'Deeptech', 'OMR', 'Chennai', 2022, '11-50', '$5M', 'Seed', 'active', 'https://vayurobotics.com', 'https://linkedin.com/company/vayu-robotics', 'https://www.google.com/s2/favicons?domain=vayurobotics.com&sz=128')
ON CONFLICT (name) DO NOTHING;

-- Verify counts
DO $$
DECLARE
    bangalore_count INTEGER;
    chennai_count INTEGER;
    total_jobs INTEGER;
BEGIN
    SELECT COUNT(*) INTO bangalore_count FROM companies WHERE city = 'Bengaluru';
    SELECT COUNT(*) INTO chennai_count FROM companies WHERE city = 'Chennai';
    SELECT COUNT(*) INTO total_jobs FROM jobs WHERE is_active = true;
    RAISE NOTICE 'Bangalore: % companies', bangalore_count;
    RAISE NOTICE 'Chennai: % companies', chennai_count;
    RAISE NOTICE 'Active jobs: %', total_jobs;
END $$;
