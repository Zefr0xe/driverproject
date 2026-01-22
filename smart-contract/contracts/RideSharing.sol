// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title RideSharing
 * @dev Kontrak Pintar (Smart Contract) untuk Sistem Berbagi Tumpangan Terdesentralisasi.
 *      TUJUAN: Mengelola interaksi antara pengemudi dan penumpang secara langsung tanpa perantara,
 *      termasuk pendaftaran, pemesanan, pembayaran (escrow), dan penyelesaian perjalanan.
 */
contract RideSharing {
    
    // ================= Struct & Enum (Struktur Data) =================

    // Struktur untuk menyimpan data Pengemudi
    struct Driver {
        address wallet;      // Alamat dompet digital pengemudi (sebagai identitas unik)
        string name;         // Nama lengkap pengemudi
        uint256 fare;        // Tarif perjalanan (saat ini disederhanakan menjadi tarif flat)
        bool isRegistered;   // Penanda apakah pengemudi sudah terdaftar resmi di sistem
    }

    // Struktur untuk menyimpan data Perjalanan (Ride)
    struct Ride {
        uint256 id;          // ID unik untuk setiap perjalanan
        address passenger;   // Alamat dompet penumpang yang memesan
        address driver;      // Alamat dompet pengemudi yang menerima pesanan
        string origin;       // Lokasi penjemputan
        string destination;  // Lokasi tujuan
        uint256 amount;      // Jumlah dana yang dibayarkan untuk perjalanan ini
        State state;         // Status terkini dari perjalanan
    }

    // Enumerasi untuk melacak Status Perjalanan
    // Requested: Dipesan penumpang, belum diambil driver.
    // Accepted: Sudah diambil driver, belum dibayar.
    // Funded: Sudah dibayar penumpang (uang di kontrak), perjalanan dimulai.
    // CompletedByDriver: Driver sampai tujuan.
    // Finalized: Penumpang konfirmasi, uang cair ke driver.
    // Cancelled: Dibatalkan (sebelum jalan).
    enum State { Requested, Accepted, Funded, CompletedByDriver, Finalized, Cancelled }

    // ================= Variabel State (Penyimpanan Data) =================

    // Menyimpan data detail pengemudi yang dipetakan dari alamat wallet mereka
    mapping(address => Driver) public drivers;
    
    // Menyimpan daftar semua alamat pengemudi untuk keperluan iterasi/tampilan
    address[] public driverAddresses;
    
    // Menyimpan data detail perjalanan yang dipetakan dari ID perjalanan
    mapping(uint256 => Ride) public rides;
    
    // Penghitung jumlah total perjalanan, digunakan untuk membuat ID unik
    uint256 public rideCount;

    // ================= Event (Pencatatan Log Blockchain) =================
    // Event digunakan agar aplikasi frontend bisa mendeteksi perubahan di blockchain secara real-time.

    event DriverRegistered(address indexed driver, string name, uint256 fare);
    event RideRequested(uint256 indexed id, address indexed passenger, string origin, string destination);
    event RideAccepted(uint256 indexed id, address indexed driver);
    event RideFunded(uint256 indexed id, uint256 amount);
    event RideCompleted(uint256 indexed id);
    event RideFinalized(uint256 indexed id);
    event RideCancelled(uint256 indexed id);

    // ================= Fungsi Manajemen Pengemudi =================

    /**
     * @dev Fungsi untuk mendaftarkan pegemudi baru ke dalam sistem.
     *      TUJUAN: Mencatat identitas pengemudi agar valid dan bisa menerima pesanan.
     * @param _name Nama pengemudi.
     * @param _fare Tarif yang diinginkan.
     */
    function registerDriver(string memory _name, uint256 _fare) public {
        // Validasi: Satu wallet hanya boleh mendaftar satu kali
        require(!drivers[msg.sender].isRegistered, "Pengemudi sudah terdaftar");
        
        // Simpan data pengemudi ke mapping
        drivers[msg.sender] = Driver(msg.sender, _name, _fare, true);
        // Tambahkan alamat ke daftar array
        driverAddresses.push(msg.sender);
        
        // Kabarkan ke jaringan bahwa ada pendaftaran baru
        emit DriverRegistered(msg.sender, _name, _fare);
    }

    /**
     * @dev Fungsi untuk mengambil data satu pengemudi.
     *      TUJUAN: Membantu frontend menampilkan profil pengemudi tertentu.
     * @param _driverAddress Alamat wallet pengemudi.
     */
    function getDriver(address _driverAddress) public view returns (Driver memory) {
        return drivers[_driverAddress];
    }

    /**
     * @dev Fungsi untuk mengambil daftar semua pengemudi.
     *      TUJUAN: Menampilkan list pengemudi yang tersedia di aplikasi.
     */
    function getDrivers() public view returns (Driver[] memory) {
        Driver[] memory allDrivers = new Driver[](driverAddresses.length);
        for (uint i = 0; i < driverAddresses.length; i++) {
            allDrivers[i] = drivers[driverAddresses[i]];
        }
        return allDrivers;
    }

    // ================= Fungsi Manajemen Perjalanan =================

    /**
     * @dev Fungsi untuk membuat pesanan perjalanan baru.
     *      TUJUAN: Memulai siklus pemesanan oleh penumpang.
     * @param _origin Lokasi asal.
     * @param _destination Lokasi tujuan.
     */
    function requestRide(string memory _origin, string memory _destination) public {
        rideCount++; // Increment ID
        
        // Simpan data perjalanan baru dengan status awal 'Requested'
        rides[rideCount] = Ride({
            id: rideCount,
            passenger: msg.sender,
            driver: address(0), // Belum ada driver
            origin: _origin,
            destination: _destination,
            amount: 0,
            state: State.Requested
        });
        
        emit RideRequested(rideCount, msg.sender, _origin, _destination);
    }

    /**
     * @dev Fungsi bagi pengemudi untuk menerima pesanan yang tersedia.
     *      TUJUAN: Mengikat pengemudi ke pesanan tertentu dan menetapkan tarif.
     * @param _rideId ID perjalanan yang diambil.
     */
    function acceptRide(uint256 _rideId) public {
        Ride storage ride = rides[_rideId];
        
        // Validasi ketersediaan dan hak akses
        require(ride.state == State.Requested, "Perjalanan tidak tersedia");
        require(drivers[msg.sender].isRegistered, "Hanya pengemudi terdaftar yang bisa menerima");
        
        // Update data perjalanan
        ride.driver = msg.sender;
        ride.state = State.Accepted;
        ride.amount = drivers[msg.sender].fare; 
        
        emit RideAccepted(_rideId, msg.sender);
    }

    /**
     * @dev Fungsi pembayaran oleh penumpang.
     *      TUJUAN: Mengamankan uang di kontrak (Escrow) sebelum perjalanan dimulai, 
     *      sehingga pengemudi yakin uang sudah tersedia.
     * @param _rideId ID perjalanan yang akan dibayar.
     */
    function fundRide(uint256 _rideId) public payable {
        Ride storage ride = rides[_rideId];
        
        // Validasi
        require(msg.sender == ride.passenger, "Hanya penumpang yang bisa mendanai");
        require(ride.state == State.Accepted, "Perjalanan belum diterima pengemudi");
        require(msg.value >= ride.amount, "Dana tidak mencukupi");

        // Ubah status menjadi Funded (Didanai)
        ride.state = State.Funded;
        
        emit RideFunded(_rideId, msg.value);
    }

    /**
     * @dev Fungsi bagi pengemudi untuk menandai perjalanan selesai.
     *      TUJUAN: Memberitahu sistem bahwa fisik perjalanan sudah usai, menunggu konfirmasi penumpang.
     * @param _rideId ID perjalanan.
     */
    function completeRide(uint256 _rideId) public {
        Ride storage ride = rides[_rideId];
        require(msg.sender == ride.driver, "Hanya pengemudi yang bisa menyelesaikan");
        require(ride.state == State.Funded, "Perjalanan belum didanai/dimulai");

        ride.state = State.CompletedByDriver;
        emit RideCompleted(_rideId);
    }

    /**
     * @dev Fungsi konfirmasi akhir oleh penumpang.
     *      TUJUAN: Melepaskan dana dari kontrak ke dompet pengemudi (Pencairan dana).
     * @param _rideId ID perjalanan.
     */
    function confirmArrival(uint256 _rideId) public {
        Ride storage ride = rides[_rideId];
        
        // Validasi bahwa penumpang benar-benar sudah sampai (berdasarkan konfirmasinya)
        require(msg.sender == ride.passenger, "Hanya penumpang yang bisa konfirmasi");
        require(ride.state == State.CompletedByDriver, "Perjalanan belum diselesaikan oleh pengemudi");

        // Finalisasi status
        ride.state = State.Finalized;
        
        // Transfer dana ke pengemudi
        payable(ride.driver).transfer(ride.amount);
        
        emit RideFinalized(_rideId);
    }

    /**
     * @dev Fungsi pembatalan perjalanan.
     *      TUJUAN: Membatalkan pesanan dan mengembalikan dana ke penumpang jika sudah terlanjur bayar.
     * @param _rideId ID perjalanan.
     */
    function cancelRide(uint256 _rideId) public {
        Ride storage ride = rides[_rideId];
        
        require(msg.sender == ride.passenger, "Hanya penumpang yang bisa membatalkan");
        require(
            ride.state == State.Requested || 
            ride.state == State.Accepted || 
            ride.state == State.Funded, 
            "Tidak bisa membatalkan pada tahap ini"
        );

        // Mekanisme Refund: Jika uang sudah masuk (Funded), kembalikan ke penumpang
        if (ride.state == State.Funded) {
             payable(ride.passenger).transfer(ride.amount);
        }

        ride.state = State.Cancelled;
        emit RideCancelled(_rideId);
    }

    /**
     * @dev Fungsi bantuan untuk membaca data perjalanan.
     */
    function getRide(uint256 _rideId) public view returns (Ride memory) {
        return rides[_rideId];
    }
}
