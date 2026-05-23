import sqlite3, re
path = r'D:\Property Project\BACKEND\data\propestate360.db'
con = sqlite3.connect(path)
cur = con.cursor()

DISTRICTS = [
  'amritsar','bathinda','jalandhar','ludhiana','patiala','mohali','gurdaspur',
  'hoshiarpur','faridkot','mansa','moga','pathankot','ferozepur','kapurthala',
  'sangrur','tarn taran','rupnagar','barnala','fazilka','malerkotla','fatehgarh sahib',
  'muktsar','nawanshahr','fatehgarh','sas nagar','sahibzada ajit singh nagar',
  'gurgaon','gurugram','faridabad','panipat','ambala','yamunanagar','rohtak','hisar',
  'karnal','sonipat','panchkula','sirsa','bhiwani','jhajjar','mahendragarh','rewari',
  'jind','fatehabad','kaithal','palwal','charkhi dadri','nuh','tohana',
  'central delhi','east delhi','new delhi','north delhi','north east delhi','north west delhi',
  'south delhi','south east delhi','south west delhi','west delhi','shahdara','karol bagh',
  'mumbai','mumbai suburban','pune','nagpur','thane','nashik','aurangabad','solapur','kolhapur','amravati',
  'nanded','sangli','jalgaon','akola','latur','dhule','buldhana','chandrapur','parbhani','beed',
  'satara','raigad','ratnagiri','sindhudurg','hingoli','washim','gondia','washim','jalna','yavatmal',
  'bangalore','bengaluru','mysore','hubli','mangalore','belgaum','gulbarga','davangere',
  'bellary','bijapur','shimoga','tumkur','raichur','bidar','hosapete','gadag','kolar','udupi',
  'uttara kannada','kodagu','chikmagalur','shivamogga','dakshina kannada','chikkaballapur','chamarajanagar','koppal',
  'ahmedabad','surat','vadodara','rajkot','bhavnagar','jamnagar','junagadh','gandhinagar',
  'anand','navsari','morbi','nadiad','surendranagar','bharuch','mehsana','valsad','porbandar',
  'amreli','botad','patan','savli','kheda','banaskantha','devbhumi dwarka','kutch','gir somnath','chhota udaipur',
  'jaipur','jodhpur','kota','bikaner','ajmer','udaipur','bhilwara','alwar','bharatpur','sikar','pali','ganganagar','chittorgarh','barmer','jhunjhunu','tonk','dungarpur','banswara','hanumangarh','nagaur','sawai madhopur','pratapgarh','baran','dholpur','karauli','dausa','jaisalmer',
  'lucknow','kanpur','ghaziabad','agra','meerut','varanasi','allahabad','bareilly','moradabad','aligarh','gorakhpur','saharanpur','jhansi','rampur','firozabad','muzaffarnagar','mathura','etah','bulandshahr','farukhabad','etawah','mainpuri','auraiya','fatehpur','banda','chitrakoot','kaushambi','mirzapur','sonbhadra','azamgarh','mau','ballia','deoria','gonda','barabanki','sultanpur','raibareli','ambedkar nagar','siddharthnagar','basti','sant kabir nagar','maharajganj','kushinagar','shravasti','balrampur','lap','pilibhit','shahjahanpur','hardoi','unnao','sitapur','lakhimpur kheri','kheri','kanpur','jajmau','bijnor','sambhal','hathras','shamli',
  'chennai','coimbatore','madurai','tiruchirappalli','salem','tirunelveli','tiruppur','vellore','thoothukkudi','erode','tiruvannamalai','kanchipuram','karur','namakkal','dharmapuri','krishnagiri','ranipet','chengalpattu','villupuram','cuddalore','tiruvannamalai','kallakurichi','perambalur','ariyalur','sivaganga','ramanathapuram','pudukkottai','virudunagar','tenkasi','kanyakumari','mayiladuthurai','nagapattinam',
  'kolkata','howrah','durgapur','asansol','siliguri','kharagpur','haldia','raiganj','jhargram','balurghat','malda','berhampore','suri','jangipur','bishnupur','rampurhat','krishnanagar','nadia','purba medinipur','paschim medinipur','darjeeling','jalpaiguri','cooch behar','uttar dinajpur','dakshin dinajpur',
  'hyderabad','warangal','nizamabad','khammam','karimnagar','ramagundam','mahbubnagar','nalgonda','adilabad','suryapet','miragaluda','jagtial','kamareddy','wanaparthy','kothagudem','bodhan','asifabad','nirmal','tandur','vikarabadh','medchal','ranga reddy','yadadri bhuvanagiri','medak','siddipet','jangaon','bhongir','narayanpet','peddapalli','rajanna sircilla','vikarabad','dubbak',
  'visakhapatnam','vijayawada','guntur','nellore','kurnool','rajahmundry','tirupati','kadapa','anantapur','eluru','ongole','nandyal','machilipatnam','tenali','proddatur','chittoor','hindupur','srikakulam','parvatipuram','anakapalli','vizianagaram','west godavari','east godavari',
  'thiruvananthapuram','kochi','kozhikode','kollam','thrissur','palakkad','alappuzha','kottayam','kannur','malappuram','ernakulam','idukki','kasaragod','pathanamthitta','wayanad',
  'bhopal','indore','jabalpur','gwalior','ujjain','sagar','dewas','satna','ratlam','rewa','murwara','singrauli','burhanpur','khandwa','bhind','guna','shivpuri','vidisha','chhindwara','chhatarpur','damoh','panna','katni','mandla','balaghat','seoni','dindori','hoshangarabad','narmadapuram','betul','harda','dhar','indore','khargone','khandwa','barwani','timarni','alirajpur','manawar','sendhwa','shujalpur','morena','datia','rehli','ashoknagar',
  'patna','gaya','bhagalpur','muzaffarnagar','darbhanga','bihar sharif','arrah','begusarai','katihar','munger','chhapra','danapur','bettiah','saharsa','sasaram','hajipur','dehri','siwan','motihari','east champaran','west champaran','madhubani','supaul','araria','kishanganj','purnia','lakhisarai','jamui','shekhpura','nalanda','buxar','rohtash','gopalganj','madhepura',
  'cuttack','rourkela','berhampur','sambalpur','puri','balasore','bhadrak','baripada','jeypore','brahmapur','jharsuguda','dhenkanal','barbil','angul','talcher','sundargarh','rayagada','koraput','nabarangpur','kalahandi','nuapada','balangir','sonepur','bolangir','bargarh','jharsuguda','sundargarh','keonjhar','mayurbhanj','jajpur','kendrapara','ranchi','dhanbad','giridih','bokaro','hazaribag','koderma','east singhbhum','west singhbhum','jamshedpur','chaibasa','noamundi','ramgarh','daltonganj','medininagar','chatra','palamu','latehar','dumka','deoghar','pakur','sahibganj','godda','shillong','cherrapunji','tura','nongpoh','jaintia hills','east khasi hills','west khasi hills','east garo hills','west garo hills','south garo hills','aizawl','lunglei','saiha','mamit','serchhip','champhai','kolasib','sia','kohima','dimapur','mon','wokha','nagaon','tuensang','longleng','peren','gangtok','namchi','gwalshing','itanagar','naharlagun','ziro','tezu','changlang','lohit','papum pare','lower dibang valley','upper dibang valley','west kameng','east kameng','tawang','kurung kumey','kra daadi','lower subansiri','upper subansiri','west siang','east siang','siang','dibang valley','tripura','aizawl','khowai'
]
STATES = [
  'punjab','maharashtra','gujarat','rajasthan','delhi','haryana','karnataka',
  'tamil nadu','uttar pradesh','west bengal','bihar','madhya pradesh','andhra pradesh',
  'telangana','kerala','odisha','jharkhand','chhattisgarh','uttarakhand','himachal pradesh',
  'jammu and kashmir','goa','puducherry','chandigarh','dadra and nagar haveli','daman and diu',
  'lakshadweep','andaman and nicobar islands','sikkim','arunachal pradesh','nagaland','manipur','mizoram','tripura','meghalaya','assam',
]

def extractDistrict(msg):
    m = msg.lower()
    matches = [d for d in DISTRICTS if d in m]
    return None if not matches else max(matches, key=m.rfind)

def extractState(msg):
    m = msg.lower()
    matches = [s for s in STATES if s in m]
    return None if not matches else max(matches, key=m.rfind)

def extractType(msg):
    m = msg.lower()
    types = ['villa','apartment','flat','plot','land','shop','commercial','warehouse','pg','paying guest','house','bungalow','bhk']
    matches = [t for t in types if t in m]
    if not matches: return None
    last = max(matches, key=m.rfind)
    if last in ('flat','apartment'): return 'apartment'
    if last == 'land': return 'plot'
    if last == 'paying guest': return 'pg'
    if last in ('bungalow','house','bhk'): return 'house'
    return last


def extractListing(msg):
    m = msg.lower()
    matches = [t for t in ['rent','rental','lease','sale','sell','buy','purchase'] if t in m]
    if not matches: return None
    last = max(matches, key=m.rfind)
    return 'rent' if last in ['rent','rental','lease'] else 'sale'

def extractBeds(msg):
    m = re.search(r'(\d)\s*(bhk|bedroom|bed)', msg, re.I)
    return int(m.group(1)) if m else None

def extractPrice(msg):
    m = re.search(r'(\d+\.?\d*)\s*(cr|crore)', msg, re.I)
    if m: return float(m.group(1)) * 10000000
    m = re.search(r'(\d+\.?\d*)\s*(l|lakh|lac)', msg, re.I)
    if m: return float(m.group(1)) * 100000
    m = re.search(r'(\d+)\s*(k|thousand)', msg, re.I)
    if m: return int(m.group(1)) * 1000
    return None

def getProps(filters):
    sql = 'SELECT * FROM properties WHERE status="active"'
    params = []
    if filters.get('state'): sql += ' AND state LIKE ? COLLATE NOCASE'; params.append(f"%{filters['state']}%")
    if filters.get('district'): sql += ' AND district LIKE ? COLLATE NOCASE'; params.append(f"%{filters['district']}%")
    if filters.get('type'): sql += ' AND type=?'; params.append(filters['type'])
    if filters.get('listing'): sql += ' AND listing=?'; params.append(filters['listing'])
    if filters.get('maxPrice'): sql += ' AND price<=?'; params.append(filters['maxPrice'])
    if filters.get('minPrice'): sql += ' AND price>=?'; params.append(filters['minPrice'])
    if filters.get('beds'): sql += ' AND beds>=?'; params.append(filters['beds'])
    sql += ' ORDER BY featured DESC, created_at DESC LIMIT 5'
    print('Query:', sql, params)
    return cur.execute(sql, params).fetchall()

queries = [
    'Find properties in Haryana',
    'Properties in state Haryana',
    'Show properties in Chandigarh',
    'Show properties in Punjab',
    'Properties in Ludhiana',
    'Properties in Mohali',
    'Find apartments in Mohali',
    'Show me homes in Ranchi',
    'Show properties in Shimla',
    'Search properties in Hoshiarpur',
]
for q in queries:
    d = extractDistrict(q)
    s = extractState(q)
    t = extractType(q)
    l = extractListing(q)
    print('\nQUERY:', q)
    print('district', d, 'state', s, 'type', t, 'listing', l)
    results = getProps({'state': s, 'district': d, 'type': t, 'listing': l})
    print('rows', len(results))
    if results: print(results[:3])

con.close()
