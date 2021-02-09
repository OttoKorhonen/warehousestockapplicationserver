const express = require('express');
//const request = require('request');
const cors = require('cors')
const app = express();
const fetch = require('node-fetch');
const convert = require('xml-js')

app.use(cors())

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.set('Cache-control', 'public, max-age=3000')
    next();
});

app.get('https://warehousestockapplication/herokuapp.com/:category', (req, res) => {
    request(
        { url: `https://bad-api-assignment.reaktor.com/v2/products/${req.params.category}` },
        (error, response, body) => {
            if (error || response.statusCode !== 200) {
                return res.status(500).json({ type: 'error', message: err.message });
            }

            console.log('Fetching data')

            let allProducts = JSON.parse(body)

            //haetaan allProducts taulukosta kaikki valmistajat
            //käytetään .map()-funktiota taulukon läpikäyntiin
            let allManufacturers = allProducts.map(function (product) {
                return product.manufacturer
            })

            //käydään lista valmistajia läpi ja palautetaan jokaisesta valmistajasta vain yksi instanssi
            let uniqueManufacturers = allManufacturers.filter((manufacturer, removeable) => {
                return allManufacturers.indexOf(manufacturer) === removeable;
            })

            //kutsutaan sortAndReturnData-funktiota
            sortAndReturnData()

            //Funktio looppaa jokaisen valmistajan, tekee valmistajalla API-kutsun osoitteeseen. Promisessa saatu tieto muutetaan json-muotoon.
            //Saatu data loopataan läpi ja sieltä otetaan talteen id-numerot ja muutetaan niiden kirjainkoko pieneksi. Seuraavaksi käsitellään
            //xml-muodossa olevaa tietoa ja haetaan sieltä haluttu instockvalue. Näistä kahdesta saadusta tiedosta tehdään uusi olio, joka tallennetaan listaan.
            function sortAndReturnData() {
                let manufacturers = uniqueManufacturers.map(function (manufacturer) {
                    fetch(`https://bad-api-assignment.reaktor.com/v2/availability/${manufacturer}`)
                        .then(response => response.json())
                        .then(responseData => {
                            console.log('Sorting data')
                            let data = []
                            let sortAvailability = responseData.response.map(function (response) {
                                let ids = response.id.toLowerCase()
                                let instockValue = JSON.parse(convert.xml2json(response.DATAPAYLOAD))
                                let dataObjects = { id: ids, value: instockValue.elements[0].elements[1].elements[0].text }
                                data.push(dataObjects)
                            })
                            //Tässä on kaksi looppia sisäkkäin. Ulompi looppi käy läpi kaikki tuotetiedot, toinen käy läpi aikaisemmin saadut "saatavuustiedot".
                            //If-lauseessa ehtona on, jos allProducts-taulukossa oliolla on sama id, kuin data-taulukossa olevalla oliolla combinedList-taulukkoon
                            //tallennetaan uusi olio, joka saa arvot allProducts taulukosta ja siihen lisätään data-taulukosta instockvalue-arvo. 
                            console.log('Combining data')
                            let combinedList = []
                            for (i = 0; i < allProducts.length; i++) {
                                for (j = 0; j < data.length; j++) {
                                    if (allProducts[i].id == data[j].id) {
                                        combinedList.push({
                                            id: allProducts[j].id,
                                            type: allProducts[j].type,
                                            name: allProducts[j].name,
                                            color: allProducts[j].color,
                                            price: allProducts[j].price,
                                            manufacturer: allProducts[j].manufacturer,
                                            instockvalue: data[j].value
                                        })
                                    }
                                }
                            }

                            //res.json(combinedList) palauttaa uuden combinedList-listan fronendin käyttöön.
                            console.log('Returning data')
                            res.json(combinedList)
                        }).catch(err => console.error(err))
                })

            }
        }
    )
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));

