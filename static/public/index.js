// getKakao();
const btnsDownload = document.querySelectorAll("#download");
const inputText = document.getElementById("text");
const btnsUpload = document.querySelectorAll("#upload");
const inputFile = document.getElementById("upload-input");
const inputsSeperate = document.querySelectorAll(".sep-input");
const dndUpload = document.getElementById("#dnd-upload");
const infoBox = document.getElementById("info-box");

const keyMap = {
  address_name: "주소",
  road_name: "길 이름",
  main_building_no: "건물 번호",
  building_name: "건물명",
  sub_building_no: "부 건물 번호",
  region_1depth_name: "분류1",
  region_2depth_name: "분류2",
  region_3depth_name: "분류3",
  x: "위도",
  y: "경도",
  zone_no: "우편번호",
  index: "순서",
  category_group_code: "카테고리 그룹 코드",
  category_group_name: "카테고리 그룹 이름",
  category_name: "카테고리",
  distance: "거리",
  id: "ID",
  phone: "전화번호",
  place_name: "장소 이름",
  place_url: "카카오맵 URL",
  road_address_name: "도로명주소",
  keyword: "검색어",
  index: "순서",
  success: "성공여부",
};

function Process() {
  this.geocoder = new kakao.maps.services.Geocoder();
  this.places = new kakao.maps.services.Places();
  this.makeStringArray = (str, sep) => {
    return str
      .split(sep)
      .filter((v) => {
        return v !== "";
      })
      .map((v) => {
        return v.trim();
      });
  };
  this.makeStringArrayWithCSV = async (file) => {
    let readFile = (file) =>
      new Promise((resolve) => {
        let reader = new FileReader();
        reader.onload = (e) => resolve(reader.result);
        reader.readAsText(file);
      });

    let csvText = await readFile(file);
    if (csvText.substring(0, 2) === "주소")
      csvText = csvText.substring(2, csvText.length);

    let keywordAddress = new String();
    keywordAddress = csvText
      .split("\r\n")
      .filter((v) => {
        return v !== "";
      })
      .map((v) => {
        return v.trim().replace('"', "");
      });
    return keywordAddress;
  };
  this.getPlace = (keyword, index = -1) => {
    return new Promise((resolve) => {
      this.places.keywordSearch(keyword, (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
          try {
            let data = result[0];
            data.keyword = keyword;
            data.index = index;
            data.success = true;
            resolve(data);
          } catch (e) {
            resolve({ keyword, index, success: false });
            console.warn(`[${address}]데이터 분석에 오류가 발생했습니다:`, e);
          }
        } else {
          resolve({ keyword, index, success: false });
        }
      });
    });
  };
  this.getPlacesData = (keywordArray) => {
    if (!Array.isArray(keywordArray)) return console.error("배열을 입력바람.");
    return new Promise((resolve) => {
      let data = [];
      keywordArray.forEach((v, i) => {
        this.getPlace(v, i).then((res) => {
          data.push(res);
          if (data.length === keywordArray.length)
            resolve(
              data.sort((a, b) => {
                return a.index > b.index ? 1 : -1;
              })
            );
        });
      });
    });
  };
  this.getAddress = (keyword, index) => {
    return new Promise((resolve) => {
      this.geocoder.addressSearch(keyword, function (result, status) {
        if (status === kakao.maps.services.Status.OK) {
          try {
            let data = result[0].road_address;
            data.keyword = keyword;
            data.index = index;
            data.success = true;
            resolve(data);
          } catch (e) {
            resolve({ keyword, index, success: false });
            console.warn(`[${keyword}]데이터 분석에 오류가 발생했습니다:`, e);
          }
        } else {
          resolve({ keyword, index, success: false });
          //console.warn(`[${address}]에 대한 행정동을 찾을 수 없습니다.`);
        }
      });
    });
  };
  this.getDong = (keywordArray) => {
    if (!Array.isArray(keywordArray)) return console.error("배열을 입력바람.");
    return new Promise((resolve) => {
      let data = [];
      keywordArray.forEach((v, i) => {
        this.getAddress(v, i).then((res) => {
          data.push(res);
          if (data.length === keywordArray.length)
            resolve(
              data.sort((a, b) => {
                return a.index > b.index ? 1 : -1;
              })
            );
        });
      });
    });
  };
  this.makeCSVArray = (data, keyMap) => {
    /* ex) data = [ { A: "1", B: "2" }, { A: "3", B: "4" } ]
     *     keyMap = { A: "Apple", B: "Banana" }
     */ // then, return [ [ "Apple", "Banana" ], [ "1", "2" ], [ "3", "4" ] ]
    let keySet = new Set();
    data.forEach((v, i) => Object.keys(v).forEach((k) => keySet.add(k)));
    let keys = Array.from(keySet);
    let csvArray = [
      keys.map((v) => {
        return keyMap[v] ?? v;
      }),
    ];
    data.forEach((v, i) => {
      let row = [];
      keys.forEach((key) => {
        let str = String(v[key]) ?? "";
        row.push(str.replace(/,/g, "/"));
      });
      csvArray.push(row);
    });
    return csvArray;
  };
  this.keywordProcess = (keywordArray) => {
    this.getPlacesData(keywordArray).then((res) => {
      downloadCSV(
        createCSV(this.makeCSVArray(res, keyMap)),
        "data_keyword_a2a.csv"
      );
    });
  };
  this.addressProcess = (keywordArray) => {
    this.getDong(keywordArray).then((res) => {
      downloadCSV(
        createCSV(this.makeCSVArray(res, keyMap)),
        "data_address_a2a.csv"
      );
    });
  };
}

function handlerBtnDownload(value) {
  return function (e) {
    e.preventDefault();
    if (inputText.value === "") return;

    const sep = document.querySelector(".sep-input:checked").value;
    let process = new Process();
    let keywordArray = process.makeStringArray(inputText.value, sep);

    if (value === "place") process.keywordProcess(keywordArray);
    else process.addressProcess(keywordArray);
  };
}

function getHandlerInput(value, type = "file") {
  return async function handlerInputFile(event) {
    let file;
    if (type === "dnd") {
      if (event.dataTransfer?.files[0]) file = event.dataTransfer?.files[0];
    } else file = event.target.files[0];

    const process = new Process();
    let keywordArray = await process.makeStringArrayWithCSV(file);
    if (value === "place") process.keywordProcess(keywordArray);
    else process.addressProcess(keywordArray);
  };
}

/**
 * Return csv with array data
 * @param {Array} data
 */
function createCSV(data) {
  /*
  * ex) data = [[1, 2],
                [3, 4]]
  */
  let csv = [];
  data.forEach((tr, i, arr) => {
    csv.push(tr.join(","));
  });

  return csv.join("\n");
}

/**
 * Download "filename.csv" file with csv data
 * @param {[]} csv
 * @param {String} filename
 */
function downloadCSV(csv, filename) {
  var csvFile;
  var downloadLink;

  // 한글 처리
  const BOM = "\uFEFF";
  csv = BOM + csv;

  csvFile = new Blob([csv], { type: "text/csv" });
  downloadLink = document.createElement("a");
  downloadLink.download = filename;
  downloadLink.href = window.URL.createObjectURL(csvFile);
  downloadLink.style.display = "none";
  document.body.appendChild(downloadLink);
  downloadLink.click();
}

// Event listeners
document
  .getElementById("info")
  .addEventListener("click", () => (infoBox.style.display = "flex"));
infoBox.addEventListener("click", () => (infoBox.style.display = "none"));
btnsDownload.forEach((v) =>
  v.addEventListener("click", handlerBtnDownload(v.value))
);
btnsUpload.forEach((v) => {
  v.addEventListener("click", () => {
    inputFile.onchange = getHandlerInput(v.value);
    inputFile.click();
  });
  v.addEventListener("drop", (e) => {
    e.preventDefault();
    getHandlerInput(v.value, "dnd")(e);
    v.style.backgroundColor = "#4CF";
  });
  v.addEventListener("dragover", (e) => {
    e.preventDefault();
  });
  v.addEventListener("dragenter", (e) => {
    e.preventDefault();
    v.style.backgroundColor = "rgba(150, 150, 255, 0.2)";
  });
  v.addEventListener("dragleave", (e) => {
    e.preventDefault();
    v.style.backgroundColor = "#4CF";
  });
});
inputsSeperate.forEach((v) =>
  v.addEventListener("click", (e) => {
    const inputSeperate = document.getElementById("custom-seperate");
    const labelLast = document.querySelector("#sep-last span");
    if (e.target.value === "custom") {
      inputSeperate.style.display = "inline";
      labelLast.innerText = "";
    } else {
      inputSeperate.style.display = "none";
      labelLast.innerText = "직접입력";
    }
  })
);
