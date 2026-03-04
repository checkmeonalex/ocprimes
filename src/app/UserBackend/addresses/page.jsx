'use client'

import CustomSelect from '@/components/common/CustomSelect'
import LocationAutocompleteInput from '@/components/common/LocationAutocompleteInput'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAlerts } from '@/context/AlertContext'
import { ACCEPTED_COUNTRIES } from '@/lib/user/accepted-countries'
import {
  loadUserProfileBootstrap,
  primeUserProfileBootstrap,
} from '@/lib/user/profile-bootstrap-client'

const DEFAULT_COUNTRY = 'Nigeria'

const emptyAddress = {
  id: '',
  label: '',
  isDefault: false,
  line1: '',
  line2: '',
  phone: '',
  city: '',
  state: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
}

const inputClassName =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition duration-200 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10'
const countrySelectInputClass =
  'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'
const stateSelectInputClass =
  'h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition duration-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10'

const NIGERIAN_STATES = [
  'Abia',
  'Abuja',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
]

const NIGERIAN_CITIES_BY_STATE = {
  abia: [
    'Abia - Aba North',
    'Abia - Aba South',
    'Abia - Arochukwu',
    'Abia - Bende',
    'Abia - Ikwuano',
    'Abia - Isiala-Ngwa North',
    'Abia - Isiala-Ngwa South',
    'Abia - Isuikwato',
    'Abia - Obi Ngwa',
    'Abia - Ohafia',
    'Abia - Osisioma Ngwa',
    'Abia - Ugwunagbo',
    'Abia - Ukwa East',
    'Abia - Ukwa West',
    'Abia - Umu-Nneochi',
    'Abia - Umuahia North',
    'Abia - Umuahia South',
  ],
  abuja: [
    'Abuja - Abaji',
    'Abuja - Abuja Municipal Area',
    'Abuja - Bwari',
    'Abuja - Gwagwalada',
    'Abuja - Kuje',
    'Abuja - Kwali',
  ],
  adamawa: [
    'Adamawa - Demsa',
    'Adamawa - Fufore',
    'Adamawa - Ganye',
    'Adamawa - Girie',
    'Adamawa - Gombi',
    'Adamawa - Guyuk',
    'Adamawa - Hong',
    'Adamawa - Jada',
    'Adamawa - Lamurde',
    'Adamawa - Madagali',
    'Adamawa - Maiha',
    'Adamawa - Mayo-Belwa',
    'Adamawa - Michika',
    'Adamawa - Mubi North',
    'Adamawa - Mubi South',
    'Adamawa - Numan',
    'Adamawa - Shelleng',
    'Adamawa - Song',
    'Adamawa - Toungo',
    'Adamawa - Yola North',
    'Adamawa - Yola South',
  ],
  'akwa ibom': [
    'Akwa Ibom - Abak',
    'Akwa Ibom - Eastern Obolo',
    'Akwa Ibom - Eket',
    'Akwa Ibom - Esit Eket',
    'Akwa Ibom - Essien Udim',
    'Akwa Ibom - Etim Ekpo',
    'Akwa Ibom - Etinan',
    'Akwa Ibom - Ibeno',
    'Akwa Ibom - Ibesikpo Asutan',
    'Akwa Ibom - Ibiono Ibom',
    'Akwa Ibom - Ika',
    'Akwa Ibom - Ikono',
    'Akwa Ibom - Ikot Abasi',
    'Akwa Ibom - Ikot Ekpene',
    'Akwa Ibom - Ini',
    'Akwa Ibom - Itu',
    'Akwa Ibom - Mbo',
    'Akwa Ibom - Mkpat Enin',
    'Akwa Ibom - Nsit Atai',
    'Akwa Ibom - Nsit Ibom',
    'Akwa Ibom - Nsit Ubium',
    'Akwa Ibom - Obot Akara',
    'Akwa Ibom - Okobo',
    'Akwa Ibom - Onna',
    'Akwa Ibom - Oron',
    'Akwa Ibom - Oruk Anam',
    'Akwa Ibom - Udung Uko',
    'Akwa Ibom - Ukanafun',
    'Akwa Ibom - Uruan',
    'Akwa Ibom - Urue-Offong/Oruko',
    'Akwa Ibom - Uyo',
  ],
  anambra: [
    'Anambra - Aguata',
    'Anambra - Anambra East',
    'Anambra - Anambra West',
    'Anambra - Anaocha',
    'Anambra - Awka North',
    'Anambra - Awka South',
    'Anambra - Ayamelum',
    'Anambra - Dunukofia',
    'Anambra - Ekwusigo',
    'Anambra - Idemili North',
    'Anambra - Idemili South',
    'Anambra - Ihiala',
    'Anambra - Njikoka',
    'Anambra - Nnewi North',
    'Anambra - Nnewi South',
    'Anambra - Ogbaru',
    'Anambra - Onitsha North',
    'Anambra - Onitsha South',
    'Anambra - Orumba North',
    'Anambra - Orumba South',
    'Anambra - Oyi',
  ],
  bauchi: [
    'Bauchi - Alkaleri',
    'Bauchi - Bauchi',
    'Bauchi - Bogoro',
    'Bauchi - Damban',
    'Bauchi - Darazo',
    'Bauchi - Dass',
    'Bauchi - Gamawa',
    'Bauchi - Ganjuwa',
    'Bauchi - Giade',
    'Bauchi - Itas/Gadau',
    'Bauchi - Jama’are',
    'Bauchi - Katagum',
    'Bauchi - Kirfi',
    'Bauchi - Misau',
    'Bauchi - Ningi',
    'Bauchi - Shira',
    'Bauchi - Tafawa-Balewa',
    'Bauchi - Toro',
    'Bauchi - Warji',
    'Bauchi - Zaki',
  ],
  bayelsa: [
    'Bayelsa - Brass',
    'Bayelsa - Ekeremor',
    'Bayelsa - Kolokuma/Opokuma',
    'Bayelsa - Nembe',
    'Bayelsa - Ogbia',
    'Bayelsa - Sagbama',
    'Bayelsa - Southern Ijaw',
    'Bayelsa - Yenegoa',
  ],
  benue: [
    'Benue - Ado',
    'Benue - Agatu',
    'Benue - Apa',
    'Benue - Buruku',
    'Benue - Gboko',
    'Benue - Guma',
    'Benue - Gwer East',
    'Benue - Gwer West',
    'Benue - Katsina-Ala',
    'Benue - Konshisha',
    'Benue - Kwande',
    'Benue - Logo',
    'Benue - Makurdi',
    'Benue - Obi',
    'Benue - Ogbadibo',
    'Benue - Ohimini',
    'Benue - Oju',
    'Benue - Okpokwu',
    'Benue - Oturkpo',
    'Benue - Tarka',
    'Benue - Ukum',
    'Benue - Ushongo',
    'Benue - Vandeikya',
  ],
  borno: [
    'Borno - Abadam',
    'Borno - Askira/Uba',
    'Borno - Bama',
    'Borno - Bayo',
    'Borno - Biu',
    'Borno - Chibok',
    'Borno - Damboa',
    'Borno - Dikwa',
    'Borno - Gubio',
    'Borno - Guzamala',
    'Borno - Gwoza',
    'Borno - Hawul',
    'Borno - Jere',
    'Borno - Kaga',
    'Borno - Kala/Balge',
    'Borno - Konduga',
    'Borno - Kukawa',
    'Borno - Kwaya Kusar',
    'Borno - Mafa',
    'Borno - Magumeri',
    'Borno - Maiduguri',
    'Borno - Marte',
    'Borno - Mobbar',
    'Borno - Monguno',
    'Borno - Ngala',
    'Borno - Nganzai',
    'Borno - Shani',
  ],
  'cross river': [
    'Cross River - Abi',
    'Cross River - Akamkpa',
    'Cross River - Akpabuyo',
    'Cross River - Bakassi',
    'Cross River - Bekwarra',
    'Cross River - Biase',
    'Cross River - Boki',
    'Cross River - Calabar South',
    'Cross River - Calabar-Municipal',
    'Cross River - Etung',
    'Cross River - Ikom',
    'Cross River - Obanliku',
    'Cross River - Obubra',
    'Cross River - Obudu',
    'Cross River - Odukpani',
    'Cross River - Ogoja',
    'Cross River - Yakurr',
    'Cross River - Yala',
  ],
  delta: [
    'Delta - Aniocha North',
    'Delta - Aniocha South',
    'Delta - Bomadi',
    'Delta - Burutu',
    'Delta - Ethiope East',
    'Delta - Ethiope West',
    'Delta - Ika North East',
    'Delta - Ika South',
    'Delta - Isoko North',
    'Delta - Isoko South',
    'Delta - Ndokwa East',
    'Delta - Ndokwa West',
    'Delta - Okpe',
    'Delta - Oshimili North',
    'Delta - Oshimili South',
    'Delta - Patani',
    'Delta - Sapele',
    'Delta - Udu',
    'Delta - Ughelli North',
    'Delta - Ughelli South',
    'Delta - Ukwuani',
    'Delta - Uvwie',
    'Delta - Warri North',
    'Delta - Warri South',
    'Delta - Warri South West',
  ],
  ebonyi: [
    'Ebonyi - Abakaliki',
    'Ebonyi - Afikpo North',
    'Ebonyi - Afikpo South',
    'Ebonyi - Ebonyi',
    'Ebonyi - Ezza North',
    'Ebonyi - Ezza South',
    'Ebonyi - Ikwo',
    'Ebonyi - Ishielu',
    'Ebonyi - Ivo',
    'Ebonyi - Izzi',
    'Ebonyi - Ohaozara',
    'Ebonyi - Ohaukwu',
    'Ebonyi - Onicha',
  ],
  edo: [
    'Edo - Akoko-Edo',
    'Edo - Egor',
    'Edo - Esan Central',
    'Edo - Esan North East',
    'Edo - Esan South East',
    'Edo - Esan West',
    'Edo - Etsako Central',
    'Edo - Etsako East',
    'Edo - Etsako West',
    'Edo - Igueben',
    'Edo - Ikpoba-Okha',
    'Edo - Oredo',
    'Edo - Orhionmwon',
    'Edo - Ovia North East',
    'Edo - Ovia South West',
    'Edo - Owan East',
    'Edo - Owan West',
    'Edo - Uhunmwonde',
  ],
  ekiti: [
    'Ekiti - Ado Ekiti',
    'Ekiti - Aiyekire',
    'Ekiti - Efon',
    'Ekiti - Ekiti East',
    'Ekiti - Ekiti South West',
    'Ekiti - Ekiti West',
    'Ekiti - Emure',
    'Ekiti - Idosi-Osi',
    'Ekiti - Ijero',
    'Ekiti - Ikere',
    'Ekiti - Ikole',
    'Ekiti - Ilejemeje',
    'Ekiti - Irepodun/Ifelodun',
    'Ekiti - Ise/Orun',
    'Ekiti - Moba',
    'Ekiti - Oye',
  ],
  enugu: [
    'Enugu - Aninri',
    'Enugu - Awgu',
    'Enugu - Enugu East',
    'Enugu - Enugu North',
    'Enugu - Enugu South',
    'Enugu - Ezeagu',
    'Enugu - Igbo-Etiti',
    'Enugu - Igbo-Eze North',
    'Enugu - Igbo-Eze South',
    'Enugu - Isi-Uzo',
    'Enugu - Nkanu East',
    'Enugu - Nkanu West',
    'Enugu - Nsukka',
    'Enugu - Oji-River',
    'Enugu - Udenu',
    'Enugu - Udi',
    'Enugu - Uzo-Uwani',
  ],
  gombe: [
    'Gombe - Akko',
    'Gombe - Balanga',
    'Gombe - Billiri',
    'Gombe - Dukku',
    'Gombe - Funakaye',
    'Gombe - Gombe',
    'Gombe - Kaltungo',
    'Gombe - Kwami',
    'Gombe - Nafada',
    'Gombe - Shomgom',
    'Gombe - Yamaltu/Deba',
  ],
  imo: [
    'Imo - Aboh-Mbaise',
    'Imo - Ahiazu-Mbaise',
    'Imo - Ehime-Mbano',
    'Imo - Ezinihitte',
    'Imo - Ideato North',
    'Imo - Ideato South',
    'Imo - Ihitte/Uboma',
    'Imo - Ikeduru',
    'Imo - Isiala Mbano',
    'Imo - Isu',
    'Imo - Mbaitoli',
    'Imo - Ngor-Okpala',
    'Imo - Njaba',
    'Imo - Nkwerre',
    'Imo - Nwangele',
    'Imo - Obowo',
    'Imo - Oguta',
    'Imo - Ohaji/Egbema',
    'Imo - Okigwe',
    'Imo - Orlu',
    'Imo - Orsu',
    'Imo - Oru East',
    'Imo - Oru West',
    'Imo - Owerri North',
    'Imo - Owerri West',
    'Imo - Owerri-Municipal',
    'Imo - Unuimo',
  ],
  jigawa: [
    'Jigawa - Auyo',
    'Jigawa - Babura',
    'Jigawa - Biriniwa',
    'Jigawa - Birnin Kudu',
    'Jigawa - Buji',
    'Jigawa - Dutse',
    'Jigawa - Gagarawa',
    'Jigawa - Garki',
    'Jigawa - Gumel',
    'Jigawa - Guri',
    'Jigawa - Gwaram',
    'Jigawa - Gwiwa',
    'Jigawa - Hadejia',
    'Jigawa - Jahun',
    'Jigawa - Kafin Hausa',
    'Jigawa - Kaugama',
    'Jigawa - Kazaure',
    'Jigawa - Kiri Kasama',
    'Jigawa - Kiyawa',
    'Jigawa - Maigatari',
    'Jigawa - Malam Madori',
    'Jigawa - Miga',
    'Jigawa - Ringim',
    'Jigawa - Roni',
    'Jigawa - Sule Tankarkar',
    'Jigawa - Taura',
    'Jigawa - Yankwashi',
  ],
  kaduna: [
    'Kaduna - Birnin-Gwari',
    'Kaduna - Chikun',
    'Kaduna - Giwa',
    'Kaduna - Igabi',
    'Kaduna - Ikara',
    'Kaduna - Jaba',
    'Kaduna - Jemaa',
    'Kaduna - Kachia',
    'Kaduna - Kaduna North',
    'Kaduna - Kaduna South',
    'Kaduna - Kagarko',
    'Kaduna - Kajuru',
    'Kaduna - Kaura',
    'Kaduna - Kauru',
    'Kaduna - Kubau',
    'Kaduna - Kudan',
    'Kaduna - Lere',
    'Kaduna - Makarfi',
    'Kaduna - Sabon-Gari',
    'Kaduna - Sanga',
    'Kaduna - Soba',
    'Kaduna - Zangon-Kataf',
    'Kaduna - Zarki',
  ],
  kano: [
    'Kano - Ajingi',
    'Kano - Albasu',
    'Kano - Bagwai',
    'Kano - Bebeji',
    'Kano - Bichi',
    'Kano - Bunkure',
    'Kano - Dala',
    'Kano - Dambatta',
    'Kano - Dawakin Kudu',
    'Kano - Dawakin Tofa',
    'Kano - Doguwa',
    'Kano - Fagge',
    'Kano - Gabasawa',
    'Kano - Garko',
    'Kano - Garum Mallam',
    'Kano - Gaya',
    'Kano - Gezawa',
    'Kano - Gwale',
    'Kano - Gwarzo',
    'Kano - Kabo',
    'Kano - Kano Municipal',
    'Kano - Karaye',
    'Kano - Kibiya',
    'Kano - Kiru',
    'Kano - Kumbotso',
    'Kano - Kunchi',
    'Kano - Kura',
    'Kano - Madobi',
    'Kano - Makoda',
    'Kano - Minjibir',
    'Kano - Nassarawa',
    'Kano - Rano',
    'Kano - Rimin Gado',
    'Kano - Rogo',
    'Kano - Shanono',
    'Kano - Sumaila',
    'Kano - Takai',
    'Kano - Tarauni',
    'Kano - Tofa',
    'Kano - Tsanyawa',
    'Kano - Tudun Wada',
    'Kano - Ungogo',
    'Kano - Warawa',
    'Kano - Wudil',
  ],
  katsina: [
    'Katsina - Bakori',
    'Katsina - Batagarawa',
    'Katsina - Batsari',
    'Katsina - Baure',
    'Katsina - Bindawa',
    'Katsina - Charanchi',
    'Katsina - Dan Musa',
    'Katsina - Dandume',
    'Katsina - Danja',
    'Katsina - Daura',
    'Katsina - Dutsi',
    'Katsina - Dutsin-Ma',
    'Katsina - Faskari',
    'Katsina - Funtua',
    'Katsina - Ingawa',
    'Katsina - Jibia',
    'Katsina - Kafur',
    'Katsina - Kaita',
    'Katsina - Kankara',
    'Katsina - Kankia',
    'Katsina - Katsina',
    'Katsina - Kurfi',
    'Katsina - Kusada',
    'Katsina - Mai’adua',
    'Katsina - Malumfashi',
    'Katsina - Mani',
    'Katsina - Mashi',
    'Katsina - Matazu',
    'Katsina - Musawa',
    'Katsina - Rimi',
    'Katsina - Sabuwa',
    'Katsina - Safana',
    'Katsina - Sandamu',
    'Katsina - Zango',
  ],
  kebbi: [
    'Kebbi - Aleiro',
    'Kebbi - Arewa-Dandi',
    'Kebbi - Argungu',
    'Kebbi - Augie',
    'Kebbi - Bagudo',
    'Kebbi - Birnin Kebbi',
    'Kebbi - Bunza',
    'Kebbi - Dandi',
    'Kebbi - Fakai',
    'Kebbi - Gwandu',
    'Kebbi - Jega',
    'Kebbi - Kalgo',
    'Kebbi - Koko/Besse',
    'Kebbi - Maiyama',
    'Kebbi - Ngaski',
    'Kebbi - Sakaba',
    'Kebbi - Shanga',
    'Kebbi - Suru',
    'Kebbi - Wasagu/Danko',
    'Kebbi - Yauri',
    'Kebbi - Zuru',
  ],
  kogi: [
    'Kogi - Adavi',
    'Kogi - Ajaokuta',
    'Kogi - Ankpa',
    'Kogi - Bassa',
    'Kogi - Dekina',
    'Kogi - Ibaji',
    'Kogi - Idah',
    'Kogi - Igalamela-Odolu',
    'Kogi - Ijumu',
    'Kogi - Kabba/Bunu',
    'Kogi - Kogi',
    'Kogi - Lokoja',
    'Kogi - Mopa-Muro',
    'Kogi - Ofu',
    'Kogi - Ogori/Magongo',
    'Kogi - Okehi',
    'Kogi - Okene',
    'Kogi - Olamabolo',
    'Kogi - Omala',
    'Kogi - Yagba East',
    'Kogi - Yagba West',
  ],
  kwara: [
    'Kwara - Asa',
    'Kwara - Baruten',
    'Kwara - Edu',
    'Kwara - Ekiti',
    'Kwara - Ifelodun',
    'Kwara - Ilorin East',
    'Kwara - Ilorin South',
    'Kwara - Ilorin West',
    'Kwara - Irepodun',
    'Kwara - Isin',
    'Kwara - Kaiama',
    'Kwara - Moro',
    'Kwara - Offa',
    'Kwara - Oke-Ero',
    'Kwara - Oyun',
    'Kwara - Pategi',
  ],
  nasarawa: [
    'Nasarawa - Akwanga',
    'Nasarawa - Awe',
    'Nasarawa - Doma',
    'Nasarawa - Karu',
    'Nasarawa - Keana',
    'Nasarawa - Keffi',
    'Nasarawa - Kokona',
    'Nasarawa - Lafia',
    'Nasarawa - Nassarawa',
    'Nasarawa - Nassarawa Egon',
    'Nasarawa - Obi',
    'Nasarawa - Toto',
    'Nasarawa - Wamba',
  ],
  niger: [
    'Niger - Agaie',
    'Niger - Agwara',
    'Niger - Bida',
    'Niger - Borgu',
    'Niger - Bosso',
    'Niger - Chanchaga',
    'Niger - Edati',
    'Niger - Gbako',
    'Niger - Gurara',
    'Niger - Katcha',
    'Niger - Kontagora',
    'Niger - Lapai',
    'Niger - Lavun',
    'Niger - Magama',
    'Niger - Mariga',
    'Niger - Mashegu',
    'Niger - Mokwa',
    'Niger - Muya',
    'Niger - Paikoro',
    'Niger - Rafi',
    'Niger - Rijau',
    'Niger - Shiroro',
    'Niger - Suleja',
    'Niger - Tafa',
    'Niger - Wushishi',
  ],
  ogun: [
    'Ogun - Abeokuta North',
    'Ogun - Abeokuta South',
    'Ogun - Ado-Odo/Ota',
    'Ogun - Egbado North',
    'Ogun - Egbado South',
    'Ogun - Ewekoro',
    'Ogun - Ifo',
    'Ogun - Ijebu East',
    'Ogun - Ijebu North',
    'Ogun - Ijebu North East',
    'Ogun - Ijebu Ode',
    'Ogun - Ikenne',
    'Ogun - Imeko-Afon',
    'Ogun - Ipokia',
    'Ogun - Obafemi-Owode',
    'Ogun - Odeda',
    'Ogun - Odogbolu',
    'Ogun - Ogun Waterside',
    'Ogun - Remo North',
    'Ogun - Shagamu',
  ],
  lagos: [
    'Lagos - Aboru',
    'Lagos - Abraham Adesanya',
    'Lagos - Abule ijesha',
    'Lagos - Abule-egba',
    'Lagos - Agboju',
    'Lagos - Agege',
    'Lagos - Agungi',
    'Lagos - Ajah',
    'Lagos - Ajao estate',
    'Lagos - Akesan',
    'Lagos - Akowonjo',
    'Lagos - Alaba International',
    'Lagos - Amukoko',
    'Lagos - Amuwo odofin',
    'Lagos - Anthony',
    'Lagos - Apapa',
    'Lagos - Awoyaya',
    'Lagos - Ayobo',
    'Lagos - Badagry',
    'Lagos - Badore',
    'Lagos - Bariga',
    'Lagos - Baruwa',
    'Lagos - Bogije',
    'Lagos - Cement',
    'Lagos - Chevron',
    'Lagos - Coker/orile',
    'Lagos - Dopemu',
    'Lagos - Ebute-metta',
    'Lagos - Ebute-metta West/Costain',
    'Lagos - Egbe',
    'Lagos - Egbeda',
    'Lagos - Ejigbo',
    'Lagos - Eko atlantic',
    'Lagos - Epe',
    'Lagos - Fagba',
    'Lagos - Festac town',
    'Lagos - Gbagada',
    'Lagos - Iba',
    'Lagos - Ibeju Lekki',
    'Lagos - Idimu',
    'Lagos - Igando',
    'Lagos - Igbobi',
    'Lagos - Ijegun',
    'Lagos - Ijeshatedo',
    'Lagos - Ijora',
    'Lagos - Iju road',
    'Lagos - Ikate',
    'Lagos - Ikeja',
    'Lagos - Ikeja/Computer Village',
    'Lagos - Ikeja/International Airport',
    'Lagos - Ikorodu',
    'Lagos - Ikota',
    'Lagos - Ikotun',
    'Lagos - Ikoyi',
    'Lagos - Ilasamaja',
    'Lagos - Ilupeju',
    'Lagos - Ipaja',
    'Lagos - Isashi',
    'Lagos - Isheri osun',
    'Lagos - Isolo',
    'Lagos - Itire',
    'Lagos - Iwaya',
    'Lagos - Jakande',
    'Lagos - Jibowu',
    'Lagos - Ketu',
    'Lagos - Kirikiri',
    'Lagos - Lagos Business School',
    'Lagos - Lagos Island',
    'Lagos - Lakowe',
    'Lagos - Lasu',
    'Lagos - Lasu-isheri',
    'Lagos - Lekki Phase 1',
    'Lagos - Magodo Phase 1',
    'Lagos - Magodo Phase 2',
    'Lagos - Makoko',
    'Lagos - Maryland',
    'Lagos - Meiran',
    'Lagos - Mile 12',
    'Lagos - Mile 2',
    'Lagos - Mushin',
    'Lagos - New oko-oba',
    'Lagos - Obadore',
    'Lagos - Obanikoro',
    'Lagos - Obawole',
    'Lagos - Ogba',
    'Lagos - Ogombo',
    'Lagos - Ogudu',
    'Lagos - Ojo',
    'Lagos - Ojodu Berger',
    'Lagos - Ojokoro',
    'Lagos - Ojota',
    'Lagos - Ojuelegba',
    'Lagos - Oke odo',
    'Lagos - Okokomaiko',
    'Lagos - Okota',
    'Lagos - Omole phase 1',
    'Lagos - Omole phase 2',
    'Lagos - Onike',
    'Lagos - Onipanu',
    'Lagos - Oniru',
    'Lagos - Opic Isheri North',
    'Lagos - Oregun',
    'Lagos - Osapa London',
    'Lagos - Oshodi',
    'Lagos - Oworoshoki',
    'Lagos - Palmgrove',
    'Lagos - Pedro',
    'Lagos - Sangotedo',
    'Lagos - Satellite Town',
    'Lagos - Shasha',
    'Lagos - Shomolu',
    'Lagos - Suru-alaba',
    'Lagos - Surulere',
    'Lagos - Trade-Fair',
    'Lagos - VGC',
    'Lagos - Victoria Island',
    'Lagos - Yaba',
  ],
  ondo: [
    'Ondo - Akoko North East',
    'Ondo - Akoko North West',
    'Ondo - Akoko South East',
    'Ondo - Akoko South West',
    'Ondo - Akure North',
    'Ondo - Akure South',
    'Ondo - Ese-Odo',
    'Ondo - Idanre',
    'Ondo - Ifedore',
    'Ondo - Ilaje',
    'Ondo - Ile-Oluji-Okeigbo',
    'Ondo - Irele',
    'Ondo - Odigbo',
    'Ondo - Okitipupa',
    'Ondo - Ondo East',
    'Ondo - Ondo West',
    'Ondo - Ose',
    'Ondo - Owo',
  ],
  osun: [
    'Osun - Aiyedade',
    'Osun - Aiyedire',
    'Osun - Atakunmosa East',
    'Osun - Atakunmosa West',
    'Osun - Boluwaduro',
    'Osun - Boripe',
    'Osun - Ede North',
    'Osun - Ede South',
    'Osun - Egbedore',
    'Osun - Ejigbo',
    'Osun - Ife Central',
    'Osun - Ife East',
    'Osun - Ife North',
    'Osun - Ife South',
    'Osun - Ifedayo',
    'Osun - Ifelod-un',
    'Osun - Ila',
    'Osun - Ilesha East',
    'Osun - Ilesha West',
    'Osun - Irepodu-n',
    'Osun - Irewole',
    'Osun - Isokan',
    'Osun - Iwo',
    'Osun - Obokun',
    'Osun - Odo-Otin',
    'Osun - Ola-Oluwa',
    'Osun - Olorunda',
    'Osun - Oriade',
    'Osun - Orolu',
    'Osun - Osogbo',
  ],
  oyo: [
    'Oyo - Afijio',
    'Oyo - Akinyele',
    'Oyo - Atiba',
    'Oyo - Atisbo',
    'Oyo - Egbedaa',
    'Oyo - Ibadan North',
    'Oyo - Ibadan North East',
    'Oyo - Ibadan North West',
    'Oyo - Ibadan South East',
    'Oyo - Ibadan South West',
    'Oyo - Ibarapa Central',
    'Oyo - Ibarapa East',
    'Oyo - Ibarapa North',
    'Oyo - Ido',
    'Oyo - Irepo',
    'Oyo - Iseyin',
    'Oyo - Itesiwaju',
    'Oyo - Iwajowa',
    'Oyo - Kajola',
    'Oyo - Lagelu',
    'Oyo - Ogbmosho South',
    'Oyo - Ogbomosho North',
    'Oyo - Ogo Oluwa',
    'Oyo - Olorunsogo',
    'Oyo - Oluyole',
    'Oyo - Ona-Ara',
    'Oyo - Orelope',
    'Oyo - Ori Ire',
    'Oyo - Oyo East',
    'Oyo - Oyo West',
    'Oyo - Saki East',
    'Oyo - Saki West',
    'Oyo - Suruleree',
  ],
  plateau: [
    'Plateau - Barkin Ladi',
    'Plateau - Bassaa',
    'Plateau - Bokkos',
    'Plateau - Jos East',
    'Plateau - Jos North',
    'Plateau - Jos South',
    'Plateau - Kanam',
    'Plateau - Kanke',
    'Plateau - Langtang North',
    'Plateau - Langtang South',
    'Plateau - Mangu',
    'Plateau - Mikang',
    'Plateau - Pankshin',
    'Plateau - Qua’an Pan',
    'Plateau - Riyom',
    'Plateau - Shendam',
    'Plateau - Wase',
  ],
  rivers: [
    'Rivers - Abua/Odual',
    'Rivers - Ahoada East',
    'Rivers - Ahoada West',
    'Rivers - Akuku Toru',
    'Rivers - Andoni',
    'Rivers - Asari-Toru',
    'Rivers - Bonny',
    'Rivers - Degema',
    'Rivers - Eleme',
    'Rivers - Emuoha',
    'Rivers - Etche',
    'Rivers - Gokana',
    'Rivers - Ikwerre',
    'Rivers - Khana',
    'Rivers - Obio/Akpor',
    'Rivers - Ogba/Egbema/Ndoni',
    'Rivers - Ogu/Bolo',
    'Rivers - Okrika',
    'Rivers - Omumma',
    'Rivers - Opobo/Nkoro',
    'Rivers - Oyigbo',
    'Rivers - Port-Harcourt',
    'Rivers - Tai',
  ],
  sokoto: [
    'Sokoto - Binji',
    'Sokoto - Bodinga',
    'Sokoto - Dange-Shuni',
    'Sokoto - Gada',
    'Sokoto - Goronyo',
    'Sokoto - Gudu',
    'Sokoto - Gwadabawa',
    'Sokoto - Illela',
    'Sokoto - Isa',
    'Sokoto - Kebbe',
    'Sokoto - Kware',
    'Sokoto - Rabah',
    'Sokoto - Sabon Birni',
    'Sokoto - Shagari',
    'Sokoto - Silame',
    'Sokoto - Sokoto North',
    'Sokoto - Sokoto South',
    'Sokoto - Tambuwal',
    'Sokoto - Tangaza',
    'Sokoto - Tureta',
    'Sokoto - Wamako',
    'Sokoto - Wurno',
    'Sokoto - Yabo',
  ],
  taraba: [
    'Taraba - Ardo-Kola',
    'Taraba - Bali',
    'Taraba - Disputed Areas',
    'Taraba - Donga',
    'Taraba - Gashaka',
    'Taraba - Gassol',
    'Taraba - Ibi',
    'Taraba - Jalingo',
    'Taraba - Karim-Lamido',
    'Taraba - Kurmi',
    'Taraba - Lau',
    'Taraba - Sardauna',
    'Taraba - Takum',
    'Taraba - Ussa',
    'Taraba - Wukari',
    'Taraba - Yorro',
    'Taraba - Zing',
  ],
  yobe: [
    'Yobe - Barde',
    'Yobe - Bursari',
    'Yobe - Damaturu',
    'Yobe - Fika',
    'Yobe - Fune',
    'Yobe - Geidam',
    'Yobe - Gujba',
    'Yobe - Gulani',
    'Yobe - Jakusko',
    'Yobe - Karasuwa',
    'Yobe - Machina',
    'Yobe - Nangere',
    'Yobe - Nguru',
    'Yobe - Potiskum',
    'Yobe - Tarmua',
    'Yobe - Yunusari',
    'Yobe - Yusufari',
  ],
  zamfara: [
    'Zamfara - Anka',
    'Zamfara - Bakura',
    'Zamfara - Birnin Magaji/Kiyaw',
    'Zamfara - Bukkuyum',
    'Zamfara - Bungudu',
    'Zamfara - Gummi',
    'Zamfara - Gusau',
    'Zamfara - Kauran Namoda',
    'Zamfara - Maradun',
    'Zamfara - Maru',
    'Zamfara - Shinkafi',
    'Zamfara - Talata Mafara',
    'Zamfara - Tsafe',
    'Zamfara - Zurmi',
  ],
}

const normalizeLookupValue = (value) => String(value || '').trim().toLowerCase()
const NIGERIAN_STATE_LOOKUP = new Map(
  NIGERIAN_STATES.map((stateName) => [normalizeLookupValue(stateName), stateName]),
)
NIGERIAN_STATE_LOOKUP.set('fct', 'Abuja')
NIGERIAN_STATE_LOOKUP.set('federal capital territory', 'Abuja')
NIGERIAN_STATE_LOOKUP.set('federal capital territory abuja', 'Abuja')

const resolveNigerianStateName = (value) => {
  const normalized = normalizeLookupValue(value).replace(/\s+state$/, '').trim()
  return NIGERIAN_STATE_LOOKUP.get(normalized) || ''
}

const toCityOnlyName = (state, value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const stateName = String(state || '').trim()
  if (stateName) {
    const statePrefix = `${stateName.toLowerCase()} - `
    if (raw.toLowerCase().startsWith(statePrefix)) {
      return raw.slice(statePrefix.length).trim()
    }
  }
  const genericPrefixIndex = raw.indexOf(' - ')
  if (genericPrefixIndex > -1) {
    return raw.slice(genericPrefixIndex + 3).trim()
  }
  return raw
}

const getNigerianCityOptions = (state) => {
  const source = NIGERIAN_CITIES_BY_STATE[normalizeLookupValue(state)] || []
  return Array.from(new Set(source.map((entry) => toCityOnlyName(state, entry)).filter(Boolean)))
}

const ADDRESS_LABEL_SUGGESTIONS = [
  'Eg. My home',
  'Eg. My work address',
  "Eg. A friend's house",
  'Eg. Family home',
  'Eg. Pickup point',
  'Eg. Apartment address',
  'Eg. Office reception',
  'Eg. Weekend place',
  'Eg. Campus address',
  'Eg. Neighbourhood store',
  'Eg. Relative home',
  'Eg. Temporary stay',
]

const formatAddressSummary = (address) => {
  const chunks = [
    address.line1,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean)
  return chunks.join(', ')
}

const createAddressId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const getRandomAddressLabelSuggestion = (existingLabels = []) => {
  const normalized = existingLabels
    .map((label) => (label || '').trim().toLowerCase())
    .filter(Boolean)

  const available = ADDRESS_LABEL_SUGGESTIONS.filter(
    (label) => !normalized.includes(label.toLowerCase()),
  )

  const pool = available.length > 0 ? available : ADDRESS_LABEL_SUGGESTIONS
  return pool[Math.floor(Math.random() * pool.length)]
}

const AddressBookSkeleton = () => (
  <div className='relative min-h-[calc(100vh-220px)] space-y-5 px-3 pt-0 sm:px-4 sm:pt-3 lg:px-5'>
    <section className='relative -mx-3 overflow-hidden rounded-none border border-x-0 border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_58%,#f1f5f9_100%)] p-4 sm:mx-0 sm:rounded-2xl sm:border-x sm:p-5'>
      <div className='pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-slate-200/70 blur-3xl' />
      <div className='pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-slate-300/55 blur-3xl' />
      <div className='relative animate-pulse'>
        <div className='h-7 w-40 rounded-md bg-slate-200' />
        <div className='mt-2 h-4 w-72 max-w-full rounded-md bg-slate-100' />
        <div className='mt-4 flex flex-col gap-2 sm:flex-row sm:items-center'>
          <div className='h-10 w-40 rounded-xl bg-slate-100' />
          <div className='h-8 w-32 rounded-full bg-slate-100' />
        </div>
        <div className='mt-4 h-11 w-full rounded-xl bg-slate-100 sm:w-44' />
      </div>
    </section>

    <section className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {Array.from({ length: 4 }).map((_, index) => (
        <article
          key={`address-skeleton-${index}`}
          className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
        >
          <div className='animate-pulse'>
            <div className='h-4 w-32 rounded-md bg-slate-200' />
            <div className='mt-3 h-3 w-full rounded-md bg-slate-100' />
            <div className='mt-2 h-3 w-11/12 rounded-md bg-slate-100' />
            <div className='mt-2 h-3 w-3/4 rounded-md bg-slate-100' />
            <div className='mt-4 flex items-center gap-2'>
              <div className='h-8 w-14 rounded-lg bg-slate-100' />
              <div className='h-8 w-16 rounded-lg bg-slate-100' />
            </div>
          </div>
        </article>
      ))}
    </section>

    <div className='h-9 w-64 max-w-full animate-pulse rounded-xl border border-slate-200 bg-slate-50' />
  </div>
)

export default function AddressesPage() {
  const [addressType, setAddressType] = useState('shipping')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [billingAddresses, setBillingAddresses] = useState([])

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState(emptyAddress)
  const [draftLabelSuggestion, setDraftLabelSuggestion] = useState('My home')
  const [editorSheetDragY, setEditorSheetDragY] = useState(0)
  const [isEditorSheetDragging, setIsEditorSheetDragging] = useState(false)
  const [shouldAdvanceToCity, setShouldAdvanceToCity] = useState(false)
  const editorSheetStartYRef = useRef(0)
  const editorSheetCurrentYRef = useRef(0)
  const cityFieldRef = useRef(null)
  const citySelectTriggerRef = useRef(null)
  const cityInputRef = useRef(null)
  const { pushAlert } = useAlerts()

  const managedAddresses = addressType === 'billing' ? billingAddresses : addresses
  const hasAnyAddress = managedAddresses.length > 0
  const isDraftNigeria = normalizeLookupValue(draft.country) === 'nigeria'
  const draftCityOptions = useMemo(
    () => (isDraftNigeria ? getNigerianCityOptions(draft.state) : []),
    [draft.state, isDraftNigeria],
  )
  const defaultAddress = useMemo(
    () => managedAddresses.find((item) => item.isDefault) || managedAddresses[0] || null,
    [managedAddresses],
  )

  useEffect(() => {
    let isMounted = true
    const loadProfile = async () => {
      try {
        const payload = await loadUserProfileBootstrap()
        if (!payload) {
          throw new Error('Unable to load addresses.')
        }
        if (!isMounted) return

        const nextProfile = payload?.profile || {}
        setProfile(nextProfile)

        const profileAddresses = Array.isArray(nextProfile?.addresses)
          ? nextProfile.addresses
          : []
        const profileBillingAddresses = Array.isArray(nextProfile?.billingAddresses)
          ? nextProfile.billingAddresses
          : []

        if (profileAddresses.length > 0) {
          const normalized = profileAddresses
            .slice(0, 5)
            .map((item, index) => ({
              ...emptyAddress,
              ...item,
              id: item.id || createAddressId(),
              label: item.label || `Address ${index + 1}`,
            }))
          const hasDefaultFlag = normalized.some((item) => item.isDefault)
          setAddresses(
            hasDefaultFlag
              ? normalized
              : normalized.map((item, index) => ({
                  ...item,
                  isDefault: index === 0,
                })),
          )
        } else {
          const legacy = nextProfile?.deliveryAddress || {}
          const legacyHasValue = Object.values(legacy).some(Boolean)
          if (legacyHasValue) {
            setAddresses([
              {
                ...emptyAddress,
                ...legacy,
                id: createAddressId(),
                label: 'Address 1',
                isDefault: true,
              },
            ])
          } else {
            setAddresses([])
          }
        }

        if (profileBillingAddresses.length > 0) {
          const normalizedBilling = profileBillingAddresses
            .slice(0, 5)
            .map((item, index) => ({
              ...emptyAddress,
              ...item,
              id: item.id || createAddressId(),
              label: item.label || `Billing ${index + 1}`,
            }))
          const hasBillingDefault = normalizedBilling.some((item) => item.isDefault)
          setBillingAddresses(
            hasBillingDefault
              ? normalizedBilling
              : normalizedBilling.map((item, index) => ({
                  ...item,
                  isDefault: index === 0,
                })),
          )
        } else {
          setBillingAddresses([])
        }
      } catch (err) {
        if (!isMounted) return
        const message = err?.message || 'Unable to load addresses.'
        setError(message)
        pushAlert({ type: 'error', title: 'Addresses', message })
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadProfile()
    return () => {
      isMounted = false
    }
  }, [pushAlert])

  const persistAddresses = async (nextAddresses, type = addressType) => {
    if (!profile) return

    const normalized = nextAddresses.map((item, index) => ({
      ...emptyAddress,
      ...item,
      label: (item.label || '').trim() || `Address ${index + 1}`,
    }))
    const hasDefaultFlag = normalized.some((item) => item.isDefault)
    const withDefault = hasDefaultFlag
      ? normalized
      : normalized.map((item, index) => ({ ...item, isDefault: index === 0 }))

    const defaultItem = withDefault.find((item) => item.isDefault) || withDefault[0] || null
    const nextShippingAddresses = type === 'shipping' ? withDefault : addresses
    const nextBillingAddresses = type === 'billing' ? withDefault : billingAddresses
    const defaultShippingAddress =
      nextShippingAddresses.find((item) => item.isDefault) || nextShippingAddresses[0] || null
    const defaultBillingAddress =
      nextBillingAddresses.find((item) => item.isDefault) || nextBillingAddresses[0] || null
    const profileFirstName = String(profile?.firstName || profile?.displayName || 'Customer').trim() || 'Customer'
    const profileCountry =
      String(profile?.country || defaultItem?.country || defaultShippingAddress?.country || 'Unknown').trim() ||
      'Unknown'

    setIsSaving(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          firstName: profileFirstName,
          country: profileCountry,
          addresses: nextShippingAddresses,
          deliveryAddress: defaultShippingAddress
            ? {
                line1: defaultShippingAddress.line1 || '',
                line2: defaultShippingAddress.line2 || '',
                phone: defaultShippingAddress.phone || '',
                city: defaultShippingAddress.city || '',
                state: defaultShippingAddress.state || '',
                postalCode: defaultShippingAddress.postalCode || '',
                country: defaultShippingAddress.country || '',
              }
            : {
                line1: '',
                line2: '',
                phone: '',
                city: '',
                state: '',
                postalCode: '',
                country: '',
              },
          billingAddresses: nextBillingAddresses,
          billingAddress: defaultBillingAddress
            ? {
                line1: defaultBillingAddress.line1 || '',
                line2: defaultBillingAddress.line2 || '',
                phone: defaultBillingAddress.phone || '',
                city: defaultBillingAddress.city || '',
                state: defaultBillingAddress.state || '',
                postalCode: defaultBillingAddress.postalCode || '',
                country: defaultBillingAddress.country || '',
              }
            : {
                line1: '',
                line2: '',
                phone: '',
                city: '',
                state: '',
                postalCode: '',
                country: '',
              },
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to save addresses.')
      }
      primeUserProfileBootstrap(payload)
      setAddresses(nextShippingAddresses)
      setBillingAddresses(nextBillingAddresses)
      setProfile((prev) => ({
        ...(prev || {}),
        addresses: nextShippingAddresses,
        deliveryAddress: defaultShippingAddress
          ? {
              line1: defaultShippingAddress.line1 || '',
              line2: defaultShippingAddress.line2 || '',
              phone: defaultShippingAddress.phone || '',
              city: defaultShippingAddress.city || '',
              state: defaultShippingAddress.state || '',
              postalCode: defaultShippingAddress.postalCode || '',
              country: defaultShippingAddress.country || '',
            }
          : {
              line1: '',
              line2: '',
              phone: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            },
        billingAddresses: nextBillingAddresses,
        billingAddress: defaultBillingAddress
          ? {
              line1: defaultBillingAddress.line1 || '',
              line2: defaultBillingAddress.line2 || '',
              phone: defaultBillingAddress.phone || '',
              city: defaultBillingAddress.city || '',
              state: defaultBillingAddress.state || '',
              postalCode: defaultBillingAddress.postalCode || '',
              country: defaultBillingAddress.country || '',
            }
          : {
              line1: '',
              line2: '',
              phone: '',
              city: '',
              state: '',
              postalCode: '',
              country: '',
            },
      }))
      setSuccess(
        type === 'billing' ? 'Billing addresses updated.' : 'Shipping addresses updated.',
      )
      pushAlert({
        type: 'success',
        title: 'Addresses',
        message: type === 'billing' ? 'Billing addresses updated.' : 'Shipping addresses updated.',
      })
    } catch (err) {
      const message =
        err?.message ||
        (type === 'billing' ? 'Unable to save billing addresses.' : 'Unable to save addresses.')
      setError(message)
      pushAlert({ type: 'error', title: 'Addresses', message })
    } finally {
      setIsSaving(false)
    }
  }

  const openNewAddressEditor = () => {
    setError('')
    setSuccess('')
    if (managedAddresses.length >= 5) {
      const message = 'You can only save up to 5 addresses. Remove one to add another.'
      setError(message)
      pushAlert({ type: 'error', title: 'Addresses', message })
      return
    }
    setEditingId('')
    const suggestion = getRandomAddressLabelSuggestion(managedAddresses.map((item) => item.label))
    setDraftLabelSuggestion(suggestion)
    setDraft({
      ...emptyAddress,
      id: createAddressId(),
      label: '',
      isDefault: managedAddresses.length === 0,
      country: DEFAULT_COUNTRY,
    })
    setIsEditorOpen(true)
  }

  const openEditAddressEditor = (address) => {
    setEditingId(address.id)
    setDraftLabelSuggestion(address.label || getRandomAddressLabelSuggestion())
    const normalizedAddress = { ...emptyAddress, ...address }
    normalizedAddress.city = toCityOnlyName(normalizedAddress.state, normalizedAddress.city)
    normalizedAddress.phone = normalizedAddress.phone || normalizedAddress.line2 || ''
    setDraft(normalizedAddress)
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setEditingId('')
    setDraft(emptyAddress)
    setDraftLabelSuggestion('My home')
    setEditorSheetDragY(0)
    setIsEditorSheetDragging(false)
    editorSheetStartYRef.current = 0
    editorSheetCurrentYRef.current = 0
  }

  const isMobileSheetViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

  const startEditorSheetDrag = (clientY) => {
    if (!isMobileSheetViewport() || !isEditorOpen) return
    setIsEditorSheetDragging(true)
    editorSheetStartYRef.current = clientY
    editorSheetCurrentYRef.current = clientY
  }

  const moveEditorSheetDrag = (clientY) => {
    if (!isEditorSheetDragging) return
    editorSheetCurrentYRef.current = clientY
    const delta = Math.max(0, clientY - editorSheetStartYRef.current)
    setEditorSheetDragY(delta)
  }

  const endEditorSheetDrag = () => {
    if (!isEditorSheetDragging) return
    const delta = Math.max(0, editorSheetCurrentYRef.current - editorSheetStartYRef.current)
    if (delta > 110 || delta < 8) {
      closeEditor()
      return
    }
    setIsEditorSheetDragging(false)
    setEditorSheetDragY(0)
    editorSheetStartYRef.current = 0
    editorSheetCurrentYRef.current = 0
  }

  const handleEditorBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      closeEditor()
    }
  }

  useEffect(() => {
    if (!isEditorSheetDragging) return undefined
    const handlePointerMove = (event) => {
      if (event.cancelable) event.preventDefault()
      moveEditorSheetDrag(event.clientY)
    }
    const handlePointerEnd = () => {
      endEditorSheetDrag()
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [isEditorSheetDragging])

  useEffect(() => {
    if (!isEditorOpen) return undefined
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }
  }, [isEditorOpen])

  useEffect(() => {
    if (!shouldAdvanceToCity || !isEditorOpen) return undefined

    const rafId = window.requestAnimationFrame(() => {
      cityFieldRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      if (isDraftNigeria && draftCityOptions.length > 0 && citySelectTriggerRef.current) {
        citySelectTriggerRef.current.click()
      } else {
        cityInputRef.current?.focus()
      }
    })

    setShouldAdvanceToCity(false)
    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [
    draftCityOptions.length,
    isDraftNigeria,
    isEditorOpen,
    shouldAdvanceToCity,
  ])

  const updateDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const updateDraftCountry = (country) => {
    setDraft((prev) => {
      const nextCountry = String(country || '')
      if (nextCountry === prev.country) return prev
      return {
        ...prev,
        country: nextCountry,
        state: '',
        city: '',
      }
    })
  }

  const updateDraftState = (state) => {
    const resolvedNigerianState = resolveNigerianStateName(state)
    setDraft((prev) => {
      const nextState = resolvedNigerianState || String(state || '')
      const shouldSwitchToNigeria = Boolean(resolvedNigerianState)
      const isAlreadyNigeria = normalizeLookupValue(prev.country) === 'nigeria'
      if (nextState === prev.state && (!shouldSwitchToNigeria || isAlreadyNigeria)) return prev
      return {
        ...prev,
        country: shouldSwitchToNigeria ? DEFAULT_COUNTRY : prev.country,
        state: nextState,
        city: '',
      }
    })
    setShouldAdvanceToCity(true)
  }

  const validateDraft = () => {
    if (!draft.line1.trim()) return 'Address line 1 is required.'
    if (!draft.state.trim()) return 'State is required.'
    if (!draft.city.trim()) return 'City is required.'
    if (!draft.phone.trim()) return 'Phone number is required.'
    if (!draft.country.trim()) return 'Country is required.'
    return ''
  }

  const handleSaveDraft = async () => {
    const validationMessage = validateDraft()
    if (validationMessage) {
      setError(validationMessage)
      pushAlert({ type: 'error', title: 'Addresses', message: validationMessage })
      return
    }

    const draftToSave = {
      ...draft,
      label: draft.label.trim(),
      line2: '',
      phone: String(draft.phone || '').trim(),
      city: toCityOnlyName(draft.state, draft.city),
    }

    const next = editingId
      ? managedAddresses.map((item) => (item.id === editingId ? draftToSave : item))
      : [...managedAddresses, draftToSave]

    const ensureDefault = draftToSave.isDefault
      ? next.map((item) => ({ ...item, isDefault: item.id === draftToSave.id }))
      : next
    await persistAddresses(ensureDefault, addressType)
    closeEditor()
  }

  const handleDeleteAddress = async (id) => {
    const next = managedAddresses.filter((item) => item.id !== id)
    await persistAddresses(next, addressType)
  }

  const setDefaultAddress = async (id) => {
    const next = managedAddresses.map((item) => ({
      ...item,
      isDefault: item.id === id,
    }))
    await persistAddresses(next, addressType)
  }

  if (isLoading) {
    return <AddressBookSkeleton />
  }

  return (
    <div className='relative min-h-[calc(100vh-220px)] space-y-5 px-3 pt-0 sm:px-4 sm:pt-3 lg:px-5'>
      <section className='relative -mx-3 overflow-hidden rounded-none border border-x-0 border-slate-200 bg-[linear-gradient(145deg,#ffffff_0%,#f8fafc_58%,#f1f5f9_100%)] p-4 sm:mx-0 sm:rounded-2xl sm:border-x sm:p-5'>
        <div className='pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-slate-200/70 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-slate-300/55 blur-3xl' />

        <div className='relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between'>
          <div className='min-w-0 w-full sm:w-auto'>
            <h1 className='text-xl font-semibold text-slate-900'>Address book</h1>
            <p className='mt-1 max-w-[22rem] text-sm text-slate-600'>
              Manage shipping and billing addresses for faster checkout.
            </p>
            <div className='mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
              <div className='inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold'>
                <button
                  type='button'
                  onClick={() => setAddressType('shipping')}
                  className={`rounded-lg px-3.5 py-1.5 transition ${
                    addressType === 'shipping'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Shipping
                </button>
                <button
                  type='button'
                  onClick={() => setAddressType('billing')}
                  className={`rounded-lg px-3.5 py-1.5 transition ${
                    addressType === 'billing'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Billing
                </button>
              </div>
              <div className='inline-flex w-fit items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'>
                Saved: {managedAddresses.length} {managedAddresses.length === 1 ? 'address' : 'addresses'}
              </div>
            </div>
          </div>
          <button
            type='button'
            onClick={openNewAddressEditor}
            className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto'
          >
            <svg
              className='h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              aria-hidden='true'
            >
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 5v14M5 12h14' />
            </svg>
            <span className='whitespace-nowrap'>
              {addressType === 'billing' ? 'Add billing address' : 'Add new address'}
            </span>
          </button>
        </div>
      </section>

      {error ? (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700'>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className='rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700'>
          {success}
        </div>
      ) : null}

      {!hasAnyAddress ? (
        <section className='rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm transition duration-300 hover:border-slate-400'>
          <div className='mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500'>
            <svg
              className='h-8 w-8'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.7'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 20s6-6.6 6-10a6 6 0 1 0-12 0c0 3.4 6 10 6 10z'
              />
              <circle cx='12' cy='10' r='2.2' />
            </svg>
          </div>
          <h2 className='mt-4 text-lg font-semibold text-slate-900'>No address yet</h2>
          <p className='mt-1 text-sm text-slate-600'>
            {addressType === 'billing'
              ? 'Add your first billing address for payment details.'
              : 'Add your first delivery address to speed up checkout.'}
          </p>
          <button
            type='button'
            onClick={openNewAddressEditor}
            className='mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800'
          >
            Create address
          </button>
        </section>
      ) : (
        <section className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {managedAddresses.map((item, index) => {
            const summary = formatAddressSummary(item)
            return (
              <article
                key={item.id}
                className={`group rounded-2xl border p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                  item.isDefault
                    ? 'border-slate-900 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_100%)]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='truncate text-sm font-semibold text-slate-900'>
                        {item.label || `Address ${index + 1}`}
                      </h3>
                      {item.isDefault ? (
                        <span className='rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white'>
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-2 text-sm leading-6 text-slate-600'>
                      {summary || 'Address details not set.'}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setDefaultAddress(item.id)}
                    className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      item.isDefault
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-transparent group-hover:border-slate-700'
                    }`}
                    aria-label='Set as default address'
                    title='Set as default address'
                  >
                    <svg
                      className='h-3.5 w-3.5'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='3'
                      aria-hidden='true'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M5 12.5 10 17l9-9'
                      />
                    </svg>
                  </button>
                </div>

                <div className='mt-4 flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    onClick={() => openEditAddressEditor(item)}
                    className='rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => handleDeleteAddress(item.id)}
                    disabled={isSaving}
                    className='rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition duration-200 hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    Remove
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {isEditorOpen ? (
        <div
          className='fixed inset-x-0 bottom-0 top-[55px] z-[1000] overscroll-none bg-slate-900/55 backdrop-blur-sm sm:p-4'
          onClick={handleEditorBackdropClick}
        >
          <div
            className='absolute inset-x-0 bottom-0 flex max-h-[calc(100dvh-4.25rem)] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:static sm:mx-auto sm:max-h-[calc(100vh-6rem)] sm:max-w-2xl sm:rounded-2xl'
            style={{
              transform:
                editorSheetDragY > 0 && isMobileSheetViewport()
                  ? `translateY(${editorSheetDragY}px)`
                  : undefined,
              transition: isEditorSheetDragging ? 'none' : 'transform 220ms ease',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className='shrink-0 border-b border-slate-200 bg-white px-4 pb-3 pt-2 sm:px-5 sm:pt-4'>
              <button
                type='button'
                className='mx-auto mb-2.5 block h-1.5 w-14 touch-none select-none rounded-full bg-slate-300 sm:hidden'
                aria-label='Drag or tap to close'
                onPointerDown={(event) => {
                  startEditorSheetDrag(event.clientY)
                }}
              />
              <div className='flex items-center justify-between gap-3'>
                <h2 className='text-lg font-semibold text-slate-900'>
                  {editingId
                    ? addressType === 'billing'
                      ? 'Edit billing address'
                      : 'Edit address'
                    : addressType === 'billing'
                      ? 'Add billing address'
                      : 'Add new address'}
                </h2>
                <button
                  type='button'
                  onClick={closeEditor}
                  className='hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition duration-200 hover:bg-slate-50 sm:inline-flex'
                  aria-label='Close editor'
                >
                  <svg
                    className='h-4 w-4'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    aria-hidden='true'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' d='M6 6l12 12M18 6l-12 12' />
                  </svg>
                </button>
              </div>
            </div>

            <div className='address-editor-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:overflow-y-scroll sm:px-5 sm:pb-5 sm:pr-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-slate-500'>Country</label>
                  <div className='relative mt-1'>
                    {isDraftNigeria ? (
                      <span className='pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-5 w-5 overflow-hidden rounded-sm border border-slate-200'>
                        <span className='h-full w-1/3 bg-[#118647]' />
                        <span className='h-full w-1/3 bg-white' />
                        <span className='h-full w-1/3 bg-[#118647]' />
                      </span>
                    ) : (
                      <span className='pointer-events-none absolute left-3 top-1/2 z-10 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-500'>
                        <svg viewBox='0 0 24 24' className='h-4.5 w-4.5' fill='none' stroke='currentColor' strokeWidth='1.8' aria-hidden='true'>
                          <circle cx='12' cy='12' r='9' />
                          <path d='M3 12h18M12 3c2.7 2.3 4.2 5.6 4.2 9S14.7 18.7 12 21c-2.7-2.3-4.2-5.6-4.2-9S9.3 5.3 12 3Z' />
                        </svg>
                      </span>
                    )}
                      <CustomSelect
                        value={draft.country}
                        onChange={(event) => updateDraftCountry(event.target.value)}
                        autoFlip
                        searchable
                        searchPlaceholder='Search country'
                        noResultsText='No country found'
                        className={countrySelectInputClass}
                      >
                      <option value=''>Select country</option>
                      {ACCEPTED_COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country === 'International' ? 'Worldwide' : country}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                </div>
                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-slate-500'>Address label</label>
                  <input
                    type='text'
                    value={draft.label}
                    onChange={(event) => updateDraft('label', event.target.value)}
                    className={inputClassName}
                    placeholder={draftLabelSuggestion}
                  />
                </div>
              <div className='md:col-span-2'>
                <label className='text-xs font-medium text-slate-500'>
                  Address line 1<span className='text-rose-500'>*</span>
                </label>
                <input
                  type='text'
                  value={draft.line1}
                  onChange={(event) => updateDraft('line1', event.target.value)}
                  className={inputClassName}
                  placeholder='Street address'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>
                  State<span className='text-rose-500'>*</span>
                </label>
                {isDraftNigeria ? (
                  <div className='relative mt-1'>
                    <CustomSelect
                      value={draft.state}
                      onChange={(event) => updateDraftState(event.target.value)}
                      autoFlip
                      searchable
                      searchPlaceholder='Search state'
                      noResultsText='No state found'
                      className={stateSelectInputClass}
                    >
                      <option value=''>Select state</option>
                      {NIGERIAN_STATES.map((stateName) => (
                        <option key={stateName} value={stateName}>
                          {stateName}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                ) : (
                  <LocationAutocompleteInput
                    field='state'
                    value={draft.state}
                    country={draft.country}
                    placeholder='State'
                    onType={(nextValue) =>
                      {
                        const resolvedNigerianState = resolveNigerianStateName(nextValue)
                        if (resolvedNigerianState) {
                          updateDraftState(resolvedNigerianState)
                          return
                        }
                        setDraft((prev) => ({
                          ...prev,
                          state: nextValue,
                          city: '',
                        }))
                      }}
                    onSelect={(nextValue) => updateDraftState(nextValue)}
                  />
                )}
              </div>
              <div ref={cityFieldRef}>
                <label className='text-xs font-medium text-slate-500'>
                  City<span className='text-rose-500'>*</span>
                </label>
                {isDraftNigeria && draftCityOptions.length > 0 ? (
                  <div className='relative mt-1'>
                    <CustomSelect
                      triggerRef={citySelectTriggerRef}
                      value={draft.city}
                      onChange={(event) => updateDraft('city', event.target.value)}
                      autoFlip
                      searchable
                      searchPlaceholder='Search city'
                      noResultsText='No city found'
                      className={stateSelectInputClass}
                    >
                      <option value=''>Select city</option>
                      {draftCityOptions.map((cityName) => (
                        <option key={cityName} value={cityName}>
                          {cityName}
                        </option>
                      ))}
                    </CustomSelect>
                  </div>
                ) : (
                  <LocationAutocompleteInput
                    field='city'
                    value={draft.city}
                    country={draft.country}
                    state={draft.state}
                    disabled={isDraftNigeria ? false : !String(draft.state || '').trim()}
                    inputRef={cityInputRef}
                    placeholder={String(draft.state || '').trim() ? 'City' : 'Select state first'}
                    onType={(nextValue) => updateDraft('city', nextValue)}
                    onSelect={(nextValue) => updateDraft('city', nextValue)}
                  />
                )}
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>Postal code</label>
                <input
                  type='text'
                  value={draft.postalCode}
                  onChange={(event) => updateDraft('postalCode', event.target.value)}
                  className={inputClassName}
                  placeholder='Postal code'
                />
              </div>
              <div>
                <label className='text-xs font-medium text-slate-500'>
                  Phone number<span className='text-rose-500'>*</span>
                </label>
                <input
                  type='tel'
                  inputMode='tel'
                  value={draft.phone}
                  onChange={(event) => updateDraft('phone', event.target.value)}
                  className={inputClassName}
                  placeholder='Phone number'
                />
              </div>
                <label className='hidden md:col-span-2 sm:inline-flex items-center gap-2 text-sm text-slate-700'>
                  <input
                    type='checkbox'
                    checked={draft.isDefault}
                    onChange={(event) => updateDraft('isDefault', event.target.checked)}
                    className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  />
                  Use as default address
                </label>
              </div>
            </div>

            <div className='shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 sm:px-5'>
              <div className='flex flex-wrap items-center justify-between gap-2 sm:justify-end'>
                <label className='inline-flex items-center gap-2 text-sm font-medium text-slate-700 sm:hidden'>
                  <input
                    type='checkbox'
                    checked={draft.isDefault}
                    onChange={(event) => updateDraft('isDefault', event.target.checked)}
                    className='h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500'
                  />
                  Set as default
                </label>
                <button
                  type='button'
                  onClick={closeEditor}
                  disabled={isSaving}
                  className='hidden rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className='inline-flex min-w-[8.5rem] items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70'
                >
                  {isSaving ? (
                    <span className='inline-flex items-center gap-2'>
                      <span>Saving</span>
                      <span className='inline-flex items-center gap-1' aria-hidden='true'>
                        <span className='save-dot save-dot-1' />
                        <span className='save-dot save-dot-2' />
                        <span className='save-dot save-dot-3' />
                      </span>
                    </span>
                  ) : (
                    editingId
                      ? addressType === 'billing'
                        ? 'Update billing address'
                        : 'Update address'
                      : addressType === 'billing'
                        ? 'Save billing address'
                        : 'Save address'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {defaultAddress ? (
        <div className='rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600'>
          {addressType === 'billing' ? 'Default billing address:' : 'Default for checkout:'}{' '}
          <span className='font-semibold text-slate-800'>{defaultAddress.label}</span>
        </div>
      ) : null}
      <style jsx>{`
        .save-dot {
          height: 5px;
          width: 5px;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.95);
          opacity: 0.25;
          animation: saveDotPulse 1.05s ease-in-out infinite;
        }
        .save-dot-2 {
          animation-delay: 0.18s;
        }
        .save-dot-3 {
          animation-delay: 0.36s;
        }
        @keyframes saveDotPulse {
          0%,
          80%,
          100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
        @media (min-width: 640px) {
          .address-editor-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: rgba(71, 85, 105, 0.88) rgba(148, 163, 184, 0.2);
            scrollbar-gutter: stable both-edges;
          }
          .address-editor-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .address-editor-scrollbar::-webkit-scrollbar-track {
            background: rgba(148, 163, 184, 0.2);
            border-radius: 9999px;
          }
          .address-editor-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(71, 85, 105, 0.88);
            border-radius: 9999px;
          }
          .address-editor-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(30, 41, 59, 0.95);
          }
        }
      `}</style>
    </div>
  )
}
